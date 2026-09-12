"""Data Service for GridPilot / GridSense AI.

Orchestrates the data pipeline:
Loader -> Validator -> Validated Datasets.
Provides clean service interface for consumers.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Union
import pandas as pd

from app.data.loaders.demo_loader import DemoDataLoader
from app.data.validators.data_validator import (
    DataValidationError,
    ValidationResult,
    validate_sites,
    validate_generation,
    validate_weather,
    validate_operations,
    validate_alignment,
)


class DataService:
    """Service to load and validate GridPilot datasets."""

    def __init__(self, data_dir: Optional[Union[str, Path]] = None) -> None:
        self.loader = DemoDataLoader(data_dir=data_dir)

    def load_demo_data(self, validate: bool = True) -> Dict[str, Any]:
        """Load and optionally validate all demo datasets.

        Returns:
            Dict containing 'sites', 'generation', 'weather', and 'operations'.

        Raises:
            DataValidationError: If validation fails and validate is True.
        """
        sites = self.loader.load_sites()
        generation = self.loader.load_generation()
        weather = self.loader.load_weather()
        operations = self.loader.load_operations()

        if validate:
            val_summary = self.validate_datasets(
                sites=sites,
                generation=generation,
                weather=weather,
                operations=operations,
            )
            if not val_summary["valid"]:
                all_errors = []
                for key in ["sites", "generation", "weather", "operations", "alignment"]:
                    if not val_summary[key]["valid"]:
                        all_errors.extend(val_summary[key]["errors"])
                raise DataValidationError(f"Demo data validation failed: {'; '.join(all_errors)}")

        return {
            "sites": sites,
            "generation": generation,
            "weather": weather,
            "operations": operations,
        }

    def validate_datasets(
        self,
        sites: Any,
        generation: pd.DataFrame,
        weather: pd.DataFrame,
        operations: pd.DataFrame,
    ) -> Dict[str, Any]:
        """Run all validators against provided datasets and return structured results."""
        # Determine capacity for generation check
        site_capacity = 100.0
        if isinstance(sites, dict) and "capacity_mw" in sites:
            site_capacity = float(sites["capacity_mw"])
        elif isinstance(sites, list) and len(sites) > 0 and "capacity_mw" in sites[0]:
            site_capacity = float(sites[0]["capacity_mw"])

        sites_res = validate_sites(sites)
        gen_res = validate_generation(generation, site_capacity_mw=site_capacity)
        weather_res = validate_weather(weather)
        ops_res = validate_operations(operations)
        align_res = validate_alignment(generation, weather, operations)

        all_valid = (
            sites_res.valid
            and gen_res.valid
            and weather_res.valid
            and ops_res.valid
            and align_res.valid
        )

        return {
            "valid": all_valid,
            "sites": sites_res.to_dict(),
            "generation": gen_res.to_dict(),
            "weather": weather_res.to_dict(),
            "operations": ops_res.to_dict(),
            "alignment": align_res.to_dict(),
        }

    def get_demo_summary(self) -> Dict[str, Any]:
        """Return dataset counts and validation status summary."""
        data = self.loader.load_sites()
        sites_list = [data] if isinstance(data, dict) else data
        gen_df = self.loader.load_generation()
        weather_df = self.loader.load_weather()
        ops_df = self.loader.load_operations()

        val_summary = self.validate_datasets(
            sites=data,
            generation=gen_df,
            weather=weather_df,
            operations=ops_df,
        )

        return {
            "number_of_sites": len(sites_list),
            "generation_rows": len(gen_df),
            "weather_rows": len(weather_df),
            "operations_rows": len(ops_df),
            "validation": val_summary,
        }


# Convenient functional shortcut
def load_demo_data(validate: bool = True) -> Dict[str, Any]:
    """Load and optionally validate demo datasets."""
    service = DataService()
    return service.load_demo_data(validate=validate)
