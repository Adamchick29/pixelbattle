"""Read-only post-deployment checks, using only Python's standard library."""

import argparse
import base64
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


def check(base: str, username: str, password: str) -> None:
    basic = base64.b64encode(f"{username}:{password}".encode()).decode()

    def get(path: str, authenticated: bool = False):
        request = Request(base + path, headers={"Authorization": f"Basic {basic}"} if authenticated else {})
        with urlopen(request, timeout=8) as response:
            return response.read()

    assert json.loads(get("/health/ready"))["status"] == "ok"
    assert b'lang="ru"' in get("/")
    board = json.loads(get("/api/board"))
    assert board["size"] == 256 and len(board["palette"]) == 32
    try:
        get("/monitoring/vmui/")
    except HTTPError as error:
        assert error.code == 401
    else:
        raise AssertionError("Monitoring must require authentication")
    assert b"<html" in get("/monitoring/vmui/", True).lower()
    dashboards = json.loads(get("/monitoring/prometheus/vmui/custom-dashboards", True))["dashboardsSettings"]
    assert {dashboard["title"] for dashboard in dashboards} == {
        "Ресурсы сервера", "Контейнеры", "Доступность", "Использование приложения",
    }
    for dashboard in dashboards:
        for row in dashboard["rows"]:
            for panel in row["panels"]:
                for expression in panel["expr"]:
                    result = json.loads(get("/monitoring/prometheus/api/v1/query?" + urlencode({"query": expression}), True))
                    assert result.get("status") == "success", panel["title"]
    # Wait for the first exporter scrape, then require real data, not just live containers.
    queries = (
        "min(up)", "min(probe_success)",
        "count(node_memory_MemTotal_bytes)",
        'count(container_memory_working_set_bytes{container_label_com_docker_compose_project="pixel-battle"})',
        "count(pixel_battle_page_views_total)",
    )
    for attempt in range(30):
        try:
            for query in queries:
                result = json.loads(get("/monitoring/api/v1/query?" + urlencode({"query": query}), True))
                series = result["data"]["result"]
                assert series and float(series[0]["value"][1]) >= 1, query
            break
        except (AssertionError, HTTPError, URLError):
            if attempt == 29:
                raise
            time.sleep(3)
    print("Application, protected VMUI, exporters and HTTP probes are healthy.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", type=Path)
    parser.add_argument("--local", action="store_true")
    args = parser.parse_args()
    values = json.loads(args.payload.read_text()) if args.payload else os.environ
    origin = values.get("APP_ORIGIN", "http://localhost:8787").rstrip("/")
    if args.local:
        origin = "http://127.0.0.1:" + str(urlsplit(origin).port or 80)
    check(origin, values.get("MONITORING_USER", "monitor"), values["MONITORING_PASSWORD"])
