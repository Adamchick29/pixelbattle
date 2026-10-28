import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

spec = importlib.util.spec_from_file_location("prepare_server", Path(__file__).parents[2] / "scripts" / "prepare-server.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


@pytest.fixture
def payload():
    return {"APP_ORIGIN": "http://203.0.113.10", "POSTGRES_PASSWORD": "a" * 48,
            "REDIS_PASSWORD": "b" * 48, "MONITORING_USER": "monitor",
            "MONITORING_PASSWORD": "monitoring-password", "IMAGE_PREFIX": "ghcr.io/owner/repo",
            "IMAGE_TAG": "a" * 40, "GHCR_USER": "owner", "GHCR_TOKEN": "test-token"}


def test_prepare_quotes_hash_and_refuses_password_rotation(tmp_path, monkeypatch, payload):
    hashed = "$2a$14$" + "A" * 53
    monkeypatch.setattr(module.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout=hashed))
    module.prepare(payload, tmp_path)
    candidate = (tmp_path / ".env.next").read_text()
    assert f"MONITORING_PASSWORD_HASH='{hashed}'" in candidate
    assert "GHCR_TOKEN" not in candidate and payload["MONITORING_PASSWORD"] not in candidate
    with pytest.raises(ValueError, match="credential rotation"):
        module.prepare({**payload, "POSTGRES_PASSWORD": "c" * 48}, tmp_path)
    (tmp_path / ".env").write_text(candidate)
    module.prepare(payload, tmp_path)
    with pytest.raises(ValueError, match="credential rotation"):
        module.prepare({**payload, "POSTGRES_PASSWORD": "c" * 48}, tmp_path)


@pytest.mark.parametrize("field,value", [
    ("APP_ORIGIN", "http://host\nINJECT=1"), ("APP_ORIGIN", "http://host/$SECRET"),
    ("APP_ORIGIN", "http://user:password@host"), ("APP_ORIGIN", "https://host"),
    ("IMAGE_TAG", "main; echo bad"), ("POSTGRES_PASSWORD", "unsafe$password"),
    ("MONITORING_USER", "bad\nname"),
])
def test_invalid_configuration_fails_before_any_command(tmp_path, monkeypatch, payload, field, value):
    def must_not_run(*args, **kwargs):
        raise AssertionError("Command executed before configuration validation")
    monkeypatch.setattr(module.subprocess, "run", must_not_run)
    with pytest.raises(ValueError):
        module.prepare({**payload, field: value}, tmp_path)
    assert not (tmp_path / ".env.next").exists()


def test_ci_payload_is_json_not_shell_source(payload):
    special = 'quotes"; $(touch /tmp/should-never-run)'
    encoded = json.dumps({**payload, "MONITORING_PASSWORD": special})
    assert json.loads(encoded)["MONITORING_PASSWORD"] == special
