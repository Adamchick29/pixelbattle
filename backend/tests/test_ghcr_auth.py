"""Exercise the real authentication wrapper without contacting a registry or VPS."""

import json
import os
import shlex
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

import pytest


@pytest.fixture
def shell_environment(tmp_path, monkeypatch):
    bash = os.environ.get("DEPLOY_TEST_BASH")
    if not bash:
        if os.name == "nt":
            pytest.skip("Set DEPLOY_TEST_BASH to Git Bash to run shell tests on Windows")
        bash = shutil.which("bash")
    if not bash:
        pytest.skip("Bash is required")
    commands = tmp_path / "bin"
    commands.mkdir()
    python = commands / "python3"
    python.write_text(f"#!/usr/bin/env bash\nexec {shlex.quote(Path(sys.executable).as_posix())} \"$@\"\n")
    python.chmod(0o755)
    temporary = tmp_path / "temporary"
    temporary.mkdir()
    # Git Bash prepends its own executables to PATH on Windows. Reapply mocks
    # after shell startup so SSH/curl cannot make external requests in tests.
    shell_path = commands.as_posix()
    if os.name == "nt":
        shell_path = "/" + shell_path[0].lower() + shell_path[2:]
    startup = tmp_path / "shell-env.sh"
    startup.write_text(f'export PATH={shlex.quote(shell_path)}:"$PATH"\n')
    monkeypatch.setenv("BASH_ENV", startup.as_posix())
    monkeypatch.setenv("TMPDIR", temporary.as_posix())
    monkeypatch.setenv("AUTH_TEST_STATE", tmp_path.as_posix())
    return bash, commands, temporary


@pytest.mark.parametrize("login_status,deploy_status", [(0, 0), (23, 0), (0, 42)])
def test_job_credentials_are_isolated_and_removed(tmp_path, shell_environment, login_status, deploy_status):
    bash, commands, temporary = shell_environment
    docker = commands / "docker"
    docker.write_text(
        '#!/usr/bin/env bash\nset -euo pipefail\n'
        'printf "%s\\n" "$*" > "$AUTH_TEST_STATE/login-args"\n'
        'printf "%s\\n" "$DOCKER_CONFIG" > "$AUTH_TEST_STATE/config-path"\n'
        'cat > "$AUTH_TEST_STATE/token-stdin"\n'
        'printf "temporary-auth" > "$DOCKER_CONFIG/config.json"\n'
        'exit "$AUTH_TEST_LOGIN_STATUS"\n'
    )
    docker.chmod(0o755)
    original_config = tmp_path / "existing-docker-config"
    original_config.mkdir()
    (original_config / "config.json").write_text("existing-auth")
    payload = tmp_path / "payload.json"
    payload.write_text(json.dumps({"GHCR_USER": "test-actor", "GHCR_TOKEN": "test-job-token"}))
    environment = {
        **os.environ,
        "DOCKER_CONFIG": original_config.as_posix(),
        "AUTH_TEST_LOGIN_STATUS": str(login_status),
        "AUTH_TEST_DEPLOY_STATUS": str(deploy_status),
    }
    wrapper = Path(__file__).parents[2] / "scripts" / "with-ghcr-auth.sh"
    result = subprocess.run(
        [bash, str(wrapper.as_posix()), payload.as_posix(), "bash", "-e", "-c",
         'test -f "$DOCKER_CONFIG/config.json"; '
         'printf "started" > "$AUTH_TEST_STATE/deployed"; exit "$AUTH_TEST_DEPLOY_STATUS"'],
        env=environment, capture_output=True, text=True, timeout=20,
    )
    assert result.returncode == (login_status or deploy_status), result.stderr
    assert (tmp_path / "login-args").read_text().strip() == "login ghcr.io --username test-actor --password-stdin"
    assert (tmp_path / "token-stdin").read_text() == "test-job-token"
    assert (tmp_path / "deployed").exists() == (login_status == 0)
    assert not Path((tmp_path / "config-path").read_text().strip()).exists()
    assert not list(temporary.iterdir())
    assert (original_config / "config.json").read_text() == "existing-auth"
    assert "test-job-token" not in result.stdout + result.stderr


@pytest.mark.parametrize("existing_release", [False, True])
def test_ci_bundle_uses_current_scripts_with_selected_configuration(tmp_path, shell_environment, existing_release):
    bash, commands, temporary = shell_environment
    for name, body in {
        "ssh": 'cat > "$AUTH_TEST_STATE/bundle.tar.gz"',
        "curl": "exit 0",
    }.items():
        command = commands / name
        command.write_text(f"#!/usr/bin/env bash\nset -euo pipefail\n{body}\n")
        command.chmod(0o755)
    root = Path(__file__).parents[2]
    release = tmp_path / "old-release"
    if existing_release:
        (release / "infra").mkdir(parents=True)
        (release / "compose.yaml").write_text("# previous release configuration\n")
        (release / "infra" / "previous.conf").write_text("previous infrastructure")
    environment = {
        **os.environ,
        "SSH_HOST": "test.invalid", "SSH_USER": "root", "SSH_PORT": "22",
        "SSH_PRIVATE_KEY": "test-private-key", "SSH_KNOWN_HOSTS": "test-host-key",
        "APP_ORIGIN": "http://test.invalid", "POSTGRES_PASSWORD": "a" * 48,
        "REDIS_PASSWORD": "b" * 48, "MONITORING_PASSWORD": "test-monitoring",
        "GHCR_USER": "test-actor", "GHCR_TOKEN": "test-job-token",
        "IMAGE_PREFIX": "ghcr.io/owner/repo", "IMAGE_TAG": "a" * 40,
        "RELEASE_CONFIG_DIR": release.as_posix() if existing_release else ".",
    }
    result = subprocess.run(
        [bash, (root / "scripts" / "deploy-from-ci.sh").as_posix()],
        env=environment, capture_output=True, text=True, timeout=20,
    )
    assert result.returncode == 0, result.stderr
    with tarfile.open(tmp_path / "bundle.tar.gz") as bundle:
        assert bundle.extractfile("scripts/with-ghcr-auth.sh").read() == (root / "scripts" / "with-ghcr-auth.sh").read_bytes()
        expected = release if existing_release else root
        assert bundle.extractfile("compose.yaml").read() == (expected / "compose.yaml").read_bytes()
        if existing_release:
            assert bundle.extractfile("infra/previous.conf").read() == b"previous infrastructure"
        payload = json.load(bundle.extractfile("deploy-input.json"))
        assert payload["GHCR_TOKEN"] == "test-job-token"
    assert not list(temporary.iterdir())
    assert "test-job-token" not in result.stdout + result.stderr
