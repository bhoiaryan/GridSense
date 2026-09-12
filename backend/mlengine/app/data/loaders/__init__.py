"""Data loaders package."""
from app.data.loaders.demo_loader import (
    DemoDataLoader,
    load_sites,
    load_generation,
    load_weather,
    load_operations,
)

__all__ = [
    "DemoDataLoader",
    "load_sites",
    "load_generation",
    "load_weather",
    "load_operations",
]
