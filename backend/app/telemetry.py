from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram


class Metrics:
    def __init__(self) -> None:
        self.registry = CollectorRegistry()
        self.requests = Counter(
            "pixel_battle_http_requests", "HTTP requests", ["method", "route", "status"], registry=self.registry
        )
        self.latency = Histogram(
            "pixel_battle_http_request_duration_seconds", "HTTP duration", ["method", "route"],
            buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5), registry=self.registry
        )
        self.views = Counter("pixel_battle_page_views", "Page loads (durable cumulative count)", registry=self.registry)
        self.pixels = Counter("pixel_battle_placements", "Accepted pixel changes", registry=self.registry)
        self.rejected = Counter("pixel_battle_placement_rejections", "Rejected placements", ["reason"], registry=self.registry)
        self.connections = Gauge("pixel_battle_websocket_connections", "Active WebSocket connections", registry=self.registry)
        self.dependencies = Gauge("pixel_battle_dependency_up", "Dependency readiness", ["dependency"], registry=self.registry)
        self.revision = Gauge("pixel_battle_board_revision", "Committed board revision", registry=self.registry)
