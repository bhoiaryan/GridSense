import type {
  ForecastHorizon,
  ForecastPoint,
  Kpi,
  Recommendation,
  RiskEvent,
  RiskLevel,
  ScenarioInput,
  ScenarioResult,
  SiteInfo,
  SystemStatusItem
} from "../types";

export const site: SiteInfo = {
  id: "solar-01",
  name: "Dharampur Solar Park",
  location: "Gujarat, India",
  technology: "Utility-scale solar PV",
  capacityMw: 120,
  currentGenerationMw: 72.4,
  batterySoc: 68,
  batteryCapacityMwh: 54,
  chargeLimitMw: 18,
  dischargeLimitMw: 22,
  backupAvailable: true,
  backupCapacityMw: 16
};

export const forecast72hData: ForecastPoint[] = [
  // DAY 1 (TODAY) - 00:00 to 23:00
  {
    hour: "00:00",
    timestamp: "2026-09-12T00:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 00:00",
    historical: 0,
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 35,
    cloudCover: 22,
    irradiance: 0,
    temperature: 24.2,
    windSpeed: 2.8,
    humidity: 78,
    confidenceScore: 98,
    risk: "LOW",
    weatherDriver: "No solar irradiance (nighttime)",
    explanation: "Standard nocturnal zero generation. Local grid demand baseline sustained by baseload & storage."
  },
  {
    hour: "01:00",
    timestamp: "2026-09-12T01:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 01:00",
    historical: 0,
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 34,
    cloudCover: 21,
    irradiance: 0,
    temperature: 23.8,
    windSpeed: 2.6,
    humidity: 80,
    confidenceScore: 98,
    risk: "LOW",
    weatherDriver: "No solar irradiance (nighttime)",
    explanation: "Zero solar output. Plant in standby with inverter parasitic load < 0.2 MW."
  },
  {
    hour: "02:00",
    timestamp: "2026-09-12T02:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 02:00",
    historical: 0,
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 34,
    cloudCover: 20,
    irradiance: 0,
    temperature: 23.4,
    windSpeed: 2.5,
    humidity: 82,
    confidenceScore: 98,
    risk: "LOW",
    weatherDriver: "Clear nocturnal sky",
    explanation: "Zero solar output. Stable night conditions with minimal atmospheric turbulence."
  },
  {
    hour: "03:00",
    timestamp: "2026-09-12T03:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 03:00",
    historical: 0,
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 33,
    cloudCover: 22,
    irradiance: 0,
    temperature: 23.1,
    windSpeed: 2.4,
    humidity: 84,
    confidenceScore: 98,
    risk: "LOW",
    weatherDriver: "Nighttime baseline",
    explanation: "Zero solar output. Off-peak demand trough across regional feeder lines."
  },
  {
    hour: "04:00",
    timestamp: "2026-09-12T04:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 04:00",
    historical: 0,
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 33,
    cloudCover: 24,
    irradiance: 0,
    temperature: 22.9,
    windSpeed: 2.7,
    humidity: 85,
    confidenceScore: 97,
    risk: "LOW",
    weatherDriver: "Pre-dawn transition",
    explanation: "Zero generation prior to astronomical sunrise (05:42 local time)."
  },
  {
    hour: "05:00",
    timestamp: "2026-09-12T05:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 05:00",
    historical: 3,
    expected: 4,
    lower: 1,
    upper: 7,
    demand: 35,
    cloudCover: 24,
    irradiance: 55,
    temperature: 23.5,
    windSpeed: 3.1,
    humidity: 81,
    confidenceScore: 94,
    risk: "LOW",
    weatherDriver: "Dawn diffuse irradiance initiation",
    explanation: "Inverters wake up as diffuse dawn irradiance crosses activation threshold (>50 W/m²)."
  },
  {
    hour: "06:00",
    timestamp: "2026-09-12T06:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 06:00",
    historical: 12,
    expected: 14,
    lower: 10,
    upper: 18,
    demand: 38,
    cloudCover: 26,
    irradiance: 180,
    temperature: 25.1,
    windSpeed: 3.4,
    humidity: 76,
    confidenceScore: 93,
    risk: "LOW",
    weatherDriver: "Sunrise morning ramp (+125 W/m²)",
    explanation: "Steady morning solar ramp. High sun angle gain offset by light morning mist."
  },
  {
    hour: "07:00",
    timestamp: "2026-09-12T07:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 07:00",
    historical: 29,
    expected: 31,
    lower: 26,
    upper: 37,
    demand: 44,
    cloudCover: 27,
    irradiance: 360,
    temperature: 27.4,
    windSpeed: 3.8,
    humidity: 68,
    confidenceScore: 92,
    risk: "LOW",
    weatherDriver: "Direct beam irradiance surge",
    explanation: "Direct beam irradiance reaches 360 W/m². Output increases at +17 MW/hr rate."
  },
  {
    hour: "08:00",
    timestamp: "2026-09-12T08:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 08:00",
    historical: 48,
    expected: 51,
    lower: 45,
    upper: 58,
    demand: 51,
    cloudCover: 28,
    irradiance: 520,
    temperature: 29.8,
    windSpeed: 4.1,
    humidity: 61,
    confidenceScore: 92,
    risk: "LOW",
    weatherDriver: "High clearness index (Kt ~0.68)",
    explanation: "Generation matches rising morning industrial demand almost 1:1."
  },
  {
    hour: "09:00",
    timestamp: "2026-09-12T09:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 09:00",
    historical: 65,
    expected: 67,
    lower: 60,
    upper: 76,
    demand: 57,
    cloudCover: 29,
    irradiance: 650,
    temperature: 31.6,
    windSpeed: 4.3,
    humidity: 55,
    confidenceScore: 91,
    risk: "LOW",
    weatherDriver: "Optimal zenith angle & low cloud opacity",
    explanation: "Generation exceeds local demand by +10 MW; excess is routed to charging storage."
  },
  {
    hour: "10:00",
    timestamp: "2026-09-12T10:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 10:00",
    historical: 78,
    expected: 81,
    lower: 73,
    upper: 89,
    demand: 62,
    cloudCover: 30,
    irradiance: 760,
    temperature: 33.2,
    windSpeed: 4.5,
    humidity: 50,
    confidenceScore: 90,
    risk: "LOW",
    weatherDriver: "Strong solar irradiance (760 W/m²)",
    explanation: "Strong solar yield across all 4 plant zones. Thermal derating factor remains low at -3.2%."
  },
  {
    hour: "11:00",
    timestamp: "2026-09-12T11:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 11:00",
    historical: 88,
    expected: 91,
    lower: 82,
    upper: 100,
    demand: 65,
    cloudCover: 32,
    irradiance: 830,
    temperature: 34.6,
    windSpeed: 4.7,
    humidity: 46,
    confidenceScore: 90,
    risk: "LOW",
    weatherDriver: "Pre-noon peak irradiance",
    explanation: "Plant operates at 76% capacity factor. Net export headroom available to regional grid."
  },
  {
    hour: "12:00",
    timestamp: "2026-09-12T12:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 12:00",
    historical: 91,
    expected: 94,
    lower: 84,
    upper: 103,
    demand: 66,
    cloudCover: 34,
    irradiance: 850,
    temperature: 35.8,
    windSpeed: 4.9,
    humidity: 43,
    confidenceScore: 89,
    risk: "LOW",
    weatherDriver: "Solar Noon Peak (850 W/m² GHI)",
    explanation: "Diurnal generation maximum of 94 MW expected. Battery charging reached target 68% SOC."
  },
  {
    hour: "13:00",
    timestamp: "2026-09-12T13:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 13:00",
    historical: 89,
    expected: 90,
    lower: 78,
    upper: 101,
    demand: 67,
    cloudCover: 39,
    irradiance: 805,
    temperature: 36.1,
    windSpeed: 5.0,
    humidity: 42,
    confidenceScore: 88,
    risk: "LOW",
    weatherDriver: "Minor afternoon cloud scatter",
    explanation: "Slight convective cumulus formation observed. Generation remains well above 85 MW."
  },
  {
    hour: "14:00",
    timestamp: "2026-09-12T14:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 14:00",
    historical: 83,
    expected: 86,
    lower: 72,
    upper: 97,
    demand: 68,
    cloudCover: 46,
    irradiance: 710,
    temperature: 35.4,
    windSpeed: 5.2,
    humidity: 47,
    confidenceScore: 86,
    risk: "MEDIUM",
    weatherDriver: "Cloud cover increase to 46%",
    explanation: "Cloud cover begins thickening from west. Output spread widens (±12.5 MW) as uncertainty grows."
  },
  {
    hour: "15:00",
    timestamp: "2026-09-12T15:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 15:00 (NOW)",
    historical: 72.4,
    expected: 73,
    lower: 59,
    upper: 85,
    demand: 69,
    cloudCover: 55,
    irradiance: 590,
    temperature: 34.2,
    windSpeed: 5.4,
    humidity: 53,
    confidenceScore: 84,
    risk: "MEDIUM",
    weatherDriver: "Current telemetry interval (NOW) / Cloud band approaching",
    explanation: "Operational telemetry sync point. Measured generation is 72.4 MW vs 73.0 MW model prediction."
  },
  {
    hour: "16:00",
    timestamp: "2026-09-12T16:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 16:00",
    expected: 54,
    lower: 39,
    upper: 66,
    demand: 70,
    cloudCover: 68,
    irradiance: 420,
    temperature: 32.8,
    windSpeed: 5.6,
    humidity: 60,
    confidenceScore: 80,
    risk: "MEDIUM",
    weatherDriver: "Cloud cover surges to 68% + Solar declination",
    explanation: "Rapid drop in clear-sky index. Grid demand peaks at 70 MW while generation drops to 54 MW."
  },
  {
    hour: "17:00",
    timestamp: "2026-09-12T17:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 17:00",
    expected: 42,
    lower: 29,
    upper: 55,
    demand: 66,
    cloudCover: 74,
    irradiance: 270,
    temperature: 31.0,
    windSpeed: 5.7,
    humidity: 65,
    confidenceScore: 78,
    risk: "HIGH",
    weatherDriver: "Heavy cloud front (74%) + Sunset ramp-down",
    explanation: "Start of high-risk shortfall window. Solar output falls 24 MW below grid demand (66 MW demand)."
  },
  {
    hour: "18:00",
    timestamp: "2026-09-12T18:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 18:00",
    expected: 31,
    lower: 20,
    upper: 43,
    demand: 58,
    cloudCover: 76,
    irradiance: 150,
    temperature: 29.5,
    windSpeed: 5.5,
    humidity: 69,
    confidenceScore: 77,
    risk: "HIGH",
    weatherDriver: "Peak cloud density (76%) & Low sun elevation",
    explanation: "Deficit widens to 27 MW. Battery discharge of 20-22 MW required to prevent grid frequency instability."
  },
  {
    hour: "19:00",
    timestamp: "2026-09-12T19:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 19:00",
    expected: 18,
    lower: 10,
    upper: 27,
    demand: 49,
    cloudCover: 75,
    irradiance: 65,
    temperature: 28.1,
    windSpeed: 5.1,
    humidity: 73,
    confidenceScore: 76,
    risk: "HIGH",
    weatherDriver: "Dusk / Sunset completion",
    explanation: "Peak deficit reaches 31 MW before demand tapers off. Storage discharge bridges the remaining gap."
  },
  {
    hour: "20:00",
    timestamp: "2026-09-12T20:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 20:00",
    expected: 7,
    lower: 2,
    upper: 13,
    demand: 43,
    cloudCover: 72,
    irradiance: 20,
    temperature: 27.2,
    windSpeed: 4.6,
    humidity: 76,
    confidenceScore: 75,
    risk: "HIGH",
    weatherDriver: "Civil twilight end / Zero solar beam",
    explanation: "Last light disappearing. Grid transitions to thermal/hydro baseload & backup dispatch."
  },
  {
    hour: "21:00",
    timestamp: "2026-09-12T21:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 21:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 39,
    cloudCover: 64,
    irradiance: 0,
    temperature: 26.5,
    windSpeed: 4.2,
    humidity: 79,
    confidenceScore: 92,
    risk: "MEDIUM",
    weatherDriver: "Nighttime / Clearing clouds",
    explanation: "Solar generation zero. Grid operates under evening schedule with steady 39 MW demand."
  },
  {
    hour: "22:00",
    timestamp: "2026-09-12T22:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 22:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 37,
    cloudCover: 58,
    irradiance: 0,
    temperature: 25.8,
    windSpeed: 3.8,
    humidity: 81,
    confidenceScore: 93,
    risk: "MEDIUM",
    weatherDriver: "Nighttime",
    explanation: "Zero solar output. Demand decreases toward night baseload levels."
  },
  {
    hour: "23:00",
    timestamp: "2026-09-12T23:00:00+05:30",
    dayLabel: "Today",
    fullTimeLabel: "Today 23:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 36,
    cloudCover: 51,
    irradiance: 0,
    temperature: 25.2,
    windSpeed: 3.5,
    humidity: 83,
    confidenceScore: 94,
    risk: "MEDIUM",
    weatherDriver: "Nighttime / Stable cooling",
    explanation: "End of 24h operational window. Plant preparing for Day 2 morning cycle."
  },

  // DAY 2 (TOMORROW) - 00:00 to 23:00 (+24h to +47h)
  {
    hour: "D2 00:00",
    timestamp: "2026-09-13T00:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 00:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 34,
    cloudCover: 45,
    irradiance: 0,
    temperature: 24.6,
    windSpeed: 3.2,
    humidity: 84,
    confidenceScore: 88,
    risk: "LOW",
    weatherDriver: "Nighttime / Moderate cloud deck",
    explanation: "Zero solar output. Model prediction for Day 2 overnight baseline."
  },
  {
    hour: "D2 03:00",
    timestamp: "2026-09-13T03:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 03:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 32,
    cloudCover: 42,
    irradiance: 0,
    temperature: 23.5,
    windSpeed: 2.8,
    humidity: 86,
    confidenceScore: 87,
    risk: "LOW",
    weatherDriver: "Overnight low",
    explanation: "Zero solar output. Minimal variability in off-peak grid load."
  },
  {
    hour: "D2 06:00",
    timestamp: "2026-09-13T06:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 06:00",
    expected: 11,
    lower: 7,
    upper: 16,
    demand: 37,
    cloudCover: 40,
    irradiance: 160,
    temperature: 24.8,
    windSpeed: 3.3,
    humidity: 78,
    confidenceScore: 82,
    risk: "LOW",
    weatherDriver: "Sunrise with moderate cloud scatter",
    explanation: "Day 2 sunrise ramp begins. Moderate cloud cover dampens initial irradiance compared to Day 1."
  },
  {
    hour: "D2 08:00",
    timestamp: "2026-09-13T08:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 08:00",
    expected: 44,
    lower: 34,
    upper: 54,
    demand: 50,
    cloudCover: 38,
    irradiance: 480,
    temperature: 28.5,
    windSpeed: 3.9,
    humidity: 65,
    confidenceScore: 80,
    risk: "LOW",
    weatherDriver: "Morning clearing trend",
    explanation: "Morning irradiance climbs toward 480 W/m². Uncertainty range ±10 MW."
  },
  {
    hour: "D2 10:00",
    timestamp: "2026-09-13T10:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 10:00",
    expected: 74,
    lower: 60,
    upper: 86,
    demand: 60,
    cloudCover: 36,
    irradiance: 710,
    temperature: 32.0,
    windSpeed: 4.4,
    humidity: 53,
    confidenceScore: 78,
    risk: "LOW",
    weatherDriver: "Direct solar beam elevation",
    explanation: "Generation reaches 74 MW, generating surplus for Day 2 battery re-charging cycle."
  },
  {
    hour: "D2 12:00",
    timestamp: "2026-09-13T12:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 12:00",
    expected: 88,
    lower: 72,
    upper: 101,
    demand: 65,
    cloudCover: 42,
    irradiance: 790,
    temperature: 34.5,
    windSpeed: 4.8,
    humidity: 48,
    confidenceScore: 75,
    risk: "LOW",
    weatherDriver: "Midday peak / Impending frontal boundary",
    explanation: "Day 2 solar peak (88 MW). Numerical weather models forecast convective cloud buildup in the afternoon."
  },
  {
    hour: "D2 14:00",
    timestamp: "2026-09-13T14:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 14:00",
    expected: 68,
    lower: 48,
    upper: 82,
    demand: 67,
    cloudCover: 62,
    irradiance: 580,
    temperature: 33.8,
    windSpeed: 5.5,
    humidity: 58,
    confidenceScore: 72,
    risk: "MEDIUM",
    weatherDriver: "Afternoon cloud surge (62%)",
    explanation: "Significant cloud band reduces solar irradiance. Confidence interval widens to ±17 MW."
  },
  {
    hour: "D2 16:00",
    timestamp: "2026-09-13T16:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 16:00",
    expected: 38,
    lower: 22,
    upper: 52,
    demand: 69,
    cloudCover: 80,
    irradiance: 310,
    temperature: 30.5,
    windSpeed: 6.2,
    humidity: 68,
    confidenceScore: 68,
    risk: "HIGH",
    weatherDriver: "Heavy overcast cloud front (80%)",
    explanation: "Day 2 afternoon shortfall event. Solar output falls 31 MW below expected demand."
  },
  {
    hour: "D2 18:00",
    timestamp: "2026-09-13T18:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 18:00",
    expected: 19,
    lower: 9,
    upper: 29,
    demand: 57,
    cloudCover: 82,
    irradiance: 110,
    temperature: 28.0,
    windSpeed: 5.9,
    humidity: 74,
    confidenceScore: 66,
    risk: "HIGH",
    weatherDriver: "Dense overcast & Sunset convergence",
    explanation: "High risk shortfall persists. Requires scheduled battery discharge or grid import capacity."
  },
  {
    hour: "D2 20:00",
    timestamp: "2026-09-13T20:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 20:00",
    expected: 3,
    lower: 0,
    upper: 7,
    demand: 42,
    cloudCover: 75,
    irradiance: 10,
    temperature: 26.5,
    windSpeed: 4.8,
    humidity: 79,
    confidenceScore: 78,
    risk: "HIGH",
    weatherDriver: "Twilight extinction",
    explanation: "Sunset complete. Demand relies entirely on stored reserves and grid interconnect."
  },
  {
    hour: "D2 22:00",
    timestamp: "2026-09-13T22:00:00+05:30",
    dayLabel: "Tomorrow",
    fullTimeLabel: "Tomorrow 22:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 36,
    cloudCover: 60,
    irradiance: 0,
    temperature: 25.0,
    windSpeed: 3.6,
    humidity: 82,
    confidenceScore: 84,
    risk: "LOW",
    weatherDriver: "Nighttime",
    explanation: "Stable nighttime operation concluding Day 2 horizon."
  },

  // DAY 3 (+48H to +71H)
  {
    hour: "D3 02:00",
    timestamp: "2026-09-14T02:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 02:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 32,
    cloudCover: 30,
    irradiance: 0,
    temperature: 23.0,
    windSpeed: 2.7,
    humidity: 85,
    confidenceScore: 75,
    risk: "LOW",
    weatherDriver: "Nighttime clearing",
    explanation: "Day 3 weather front clearing. Barometric pressure rising."
  },
  {
    hour: "D3 06:00",
    timestamp: "2026-09-14T06:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 06:00",
    expected: 15,
    lower: 8,
    upper: 22,
    demand: 36,
    cloudCover: 18,
    irradiance: 195,
    temperature: 24.2,
    windSpeed: 3.0,
    humidity: 75,
    confidenceScore: 68,
    risk: "LOW",
    weatherDriver: "Clear sky sunrise (+195 W/m²)",
    explanation: "Clear atmospheric conditions predicted for Day 3. Higher morning yield expected."
  },
  {
    hour: "D3 08:00",
    timestamp: "2026-09-14T08:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 08:00",
    expected: 55,
    lower: 40,
    upper: 68,
    demand: 49,
    cloudCover: 16,
    irradiance: 560,
    temperature: 28.0,
    windSpeed: 3.6,
    humidity: 59,
    confidenceScore: 65,
    risk: "LOW",
    weatherDriver: "High direct beam irradiance",
    explanation: "Rapid power ramp. Generation overtakes demand early at 07:45 local."
  },
  {
    hour: "D3 10:00",
    timestamp: "2026-09-14T10:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 10:00",
    expected: 85,
    lower: 68,
    upper: 102,
    demand: 59,
    cloudCover: 15,
    irradiance: 790,
    temperature: 32.5,
    windSpeed: 4.1,
    humidity: 48,
    confidenceScore: 62,
    risk: "LOW",
    weatherDriver: "Clear high-pressure system",
    explanation: "Large surplus generation window begins (+26 MW surplus). Storage will charge at maximum 18 MW rate."
  },
  {
    hour: "D3 12:00",
    timestamp: "2026-09-14T12:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 12:00",
    expected: 98,
    lower: 78,
    upper: 115,
    demand: 64,
    cloudCover: 18,
    irradiance: 890,
    temperature: 35.0,
    windSpeed: 4.5,
    humidity: 42,
    confidenceScore: 60,
    risk: "LOW",
    weatherDriver: "Peak direct irradiance (890 W/m² GHI)",
    explanation: "72-hour forecast horizon peak (98 MW). Wide ±18.5 MW uncertainty band due to 72h numerical model dispersion."
  },
  {
    hour: "D3 14:00",
    timestamp: "2026-09-14T14:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 14:00",
    expected: 86,
    lower: 66,
    upper: 104,
    demand: 66,
    cloudCover: 25,
    irradiance: 740,
    temperature: 34.8,
    windSpeed: 4.7,
    humidity: 45,
    confidenceScore: 58,
    risk: "LOW",
    weatherDriver: "Sustained high solar yield",
    explanation: "Strong output continues (+20 MW over demand). Potential export headroom to regional grid."
  },
  {
    hour: "D3 16:00",
    timestamp: "2026-09-14T16:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 16:00",
    expected: 58,
    lower: 40,
    upper: 74,
    demand: 68,
    cloudCover: 35,
    irradiance: 460,
    temperature: 32.2,
    windSpeed: 5.0,
    humidity: 54,
    confidenceScore: 56,
    risk: "MEDIUM",
    weatherDriver: "Late afternoon solar decline",
    explanation: "Generation dips slightly below peak demand (58 MW vs 68 MW). Well within battery buffer capability."
  },
  {
    hour: "D3 18:00",
    timestamp: "2026-09-14T18:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 18:00",
    expected: 28,
    lower: 15,
    upper: 40,
    demand: 56,
    cloudCover: 40,
    irradiance: 170,
    temperature: 29.5,
    windSpeed: 4.8,
    humidity: 65,
    confidenceScore: 54,
    risk: "HIGH",
    weatherDriver: "Evening sunset ramp-down",
    explanation: "Day 3 sunset transition. Deficit of 28 MW expected; fully covered by battery charged during midday surplus."
  },
  {
    hour: "D3 20:00",
    timestamp: "2026-09-14T20:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 20:00",
    expected: 5,
    lower: 0,
    upper: 11,
    demand: 42,
    cloudCover: 42,
    irradiance: 15,
    temperature: 27.0,
    windSpeed: 3.9,
    humidity: 72,
    confidenceScore: 65,
    risk: "MEDIUM",
    weatherDriver: "Twilight",
    explanation: "Solar cycle complete. 72-hour forecast envelope concluded."
  },
  {
    hour: "D3 23:00",
    timestamp: "2026-09-14T23:00:00+05:30",
    dayLabel: "Day 3",
    fullTimeLabel: "Day 3 23:00",
    expected: 0,
    lower: 0,
    upper: 0,
    demand: 35,
    cloudCover: 40,
    irradiance: 0,
    temperature: 25.0,
    windSpeed: 3.2,
    humidity: 78,
    confidenceScore: 70,
    risk: "LOW",
    weatherDriver: "Nighttime",
    explanation: "End of 72h planning horizon."
  }
];

// Provide 24h slice for Dashboard and backward compatibility
export const forecastData: ForecastPoint[] = forecast72hData.slice(0, 24);

export function getForecastForHorizon(horizon: ForecastHorizon): ForecastPoint[] {
  if (horizon === "24h") {
    return forecast72hData.slice(0, 24);
  }
  if (horizon === "48h") {
    return forecast72hData.slice(0, 35);
  }
  return forecast72hData;
}

export interface HorizonSummary {
  horizon: ForecastHorizon;
  peakGenerationMw: number;
  peakHour: string;
  avgGenerationMw: number;
  totalProjectedMwh: number;
  totalDemandMwh: number;
  maxDeficitMw: number;
  maxSurplusMw: number;
  highRiskHoursCount: number;
  avgConfidenceScore: number;
}

export function getHorizonSummary(horizon: ForecastHorizon): HorizonSummary {
  const data = getForecastForHorizon(horizon);
  const peakPoint = data.reduce((max, p) => (p.expected > max.expected ? p : max), data[0]);
  const avgGen = data.reduce((sum, p) => sum + p.expected, 0) / data.length;
  const totalGen = data.reduce((sum, p) => sum + p.expected, 0);
  const totalDem = data.reduce((sum, p) => sum + p.demand, 0);
  
  let maxDeficit = 0;
  let maxSurplus = 0;
  let highRiskCount = 0;
  let totalConfidence = 0;

  data.forEach((p) => {
    const diff = p.demand - p.expected;
    if (diff > maxDeficit) maxDeficit = diff;
    const surplus = p.expected - p.demand;
    if (surplus > maxSurplus) maxSurplus = surplus;
    if (p.risk === "HIGH") highRiskCount++;
    totalConfidence += p.confidenceScore ?? 80;
  });

  return {
    horizon,
    peakGenerationMw: Number(peakPoint.expected.toFixed(1)),
    peakHour: peakPoint.fullTimeLabel ?? peakPoint.hour,
    avgGenerationMw: Number(avgGen.toFixed(1)),
    totalProjectedMwh: Math.round(totalGen),
    totalDemandMwh: Math.round(totalDem),
    maxDeficitMw: Number(maxDeficit.toFixed(1)),
    maxSurplusMw: Number(maxSurplus.toFixed(1)),
    highRiskHoursCount: highRiskCount,
    avgConfidenceScore: Math.round(totalConfidence / data.length)
  };
}

export interface RiskPeriodInfo {
  id: string;
  name: string;
  horizonTag: string;
  targetHour: string;
  timeWindow: string;
  risk: RiskLevel;
  type: "SHORTFALL" | "SURPLUS" | "VOLATILITY";
  metricValue: string;
  metricLabel: string;
  weatherCause: string;
  actionHint: string;
}

export const riskPeriodsList: RiskPeriodInfo[] = [
  {
    id: "risk-today-evening",
    name: "Evening Shortfall Risk",
    horizonTag: "Today (24H)",
    targetHour: "18:00",
    timeWindow: "17:00 - 20:00",
    risk: "HIGH",
    type: "SHORTFALL",
    metricValue: "31 MW deficit",
    metricLabel: "Peak shortfall",
    weatherCause: "Cloud cover jumps to 76% during sunset ramp-down",
    actionHint: "Recommend battery discharge 22 MW"
  },
  {
    id: "risk-tomorrow-storm",
    name: "Afternoon Overcast Shortfall",
    horizonTag: "Tomorrow (48H)",
    targetHour: "D2 16:00",
    timeWindow: "D2 14:00 - D2 19:00",
    risk: "HIGH",
    type: "SHORTFALL",
    metricValue: "31 MW deficit",
    metricLabel: "Expected deficit",
    weatherCause: "Convective storm band brings 80-82% cloud opacity",
    actionHint: "Pre-charge storage during 10:00-12:00 window"
  },
  {
    id: "risk-d3-surplus",
    name: "Midday Solar Surplus Headroom",
    horizonTag: "Day 3 (72H)",
    targetHour: "D3 12:00",
    timeWindow: "D3 10:00 - D3 14:00",
    risk: "LOW",
    type: "SURPLUS",
    metricValue: "+34 MW surplus",
    metricLabel: "Export headroom",
    weatherCause: "Clear atmospheric high with 890 W/m² GHI peak",
    actionHint: "Maximize battery charging & reserve export capacity"
  }
];

export const kpis: Kpi[] = [
  { label: "Current Generation", value: "72.4 MW", detail: "60.3% of installed capacity", trend: "+4.8 MW vs last hour", status: "OK" },
  { label: "Forecasted Generation", value: "58.1 MW", detail: "Next 24h average", trend: "Evening decline expected", status: "MEDIUM" },
  { label: "Current Risk", value: "HIGH", detail: "18:00-20:00 shortfall", trend: "27 MW peak deficit", status: "HIGH" },
  { label: "Battery Status", value: "68% SOC", detail: "54 MWh system online", trend: "22 MW discharge limit", status: "OK" }
];

export const riskEvents: RiskEvent[] = [
  {
    id: "evt-evening-shortfall",
    risk: "HIGH",
    type: "SHORTFALL",
    window: "17:00-20:00",
    expectedImpact: "18.6 MWh expected deficit",
    problem: "Forecasted solar output drops below anticipated evening demand while uncertainty remains elevated."
  },
  {
    id: "evt-afternoon-surplus",
    risk: "MEDIUM",
    type: "SURPLUS",
    window: "12:00-14:00",
    expectedImpact: "Up to 20 MW export headroom",
    problem: "Midday generation may exceed site requirement if cloud cover clears."
  },
  {
    id: "evt-uncertainty",
    risk: "MEDIUM",
    type: "UNCERTAINTY",
    window: "16:00-19:00",
    expectedImpact: "Wide forecast band during ramp-down",
    problem: "Cloud cover variability widens the generation range during the evening transition."
  }
];

export const recommendation: Recommendation = {
  action: "Discharge Battery",
  reason: "Expected renewable generation is below anticipated requirement during the evening shortfall window.",
  expectedImpact: "Reduce the potential deficit before backup generation is considered.",
  constraints: ["Battery SOC supports a 2 hour discharge", "Backup remains available as contingency", "Operator approval required before dispatch"]
};

export const systemStatus: SystemStatusItem[] = [
  { label: "Data Pipeline", status: "Operational", detail: "Demo data synchronized" },
  { label: "Forecast Engine", status: "Operational", detail: "24h, 48h, 72h ready" },
  { label: "Risk Engine", status: "Operational", detail: "Shortfall and surplus rules active" },
  { label: "Decision Engine", status: "Operational", detail: "Explainable rules active" }
];

export const scenarioBaseline: ScenarioResult = {
  generationMw: 58.1,
  shortfallMwh: 18.6,
  risk: "HIGH",
  recommendation: "Discharge Battery",
  explanation: "Baseline evening generation is below demand, but the current battery SOC can absorb most of the deficit."
};

export function runScenario(input: ScenarioInput): ScenarioResult {
  const generationPenalty = input.cloudCoverChange * 0.42;
  const demandPenalty = input.demandChange * 0.65;
  const generationMw = Math.max(0, scenarioBaseline.generationMw - generationPenalty);
  const shortfallMwh = Math.max(0, scenarioBaseline.shortfallMwh + generationPenalty + demandPenalty);
  const risk = shortfallMwh > 28 || !input.batteryAvailable ? "HIGH" : shortfallMwh > 12 ? "MEDIUM" : "LOW";
  const recommendation = input.batteryAvailable
    ? "Discharge Battery"
    : input.backupAvailable
      ? "Activate Backup"
      : "Import Energy";

  return {
    generationMw: Number(generationMw.toFixed(1)),
    shortfallMwh: Number(shortfallMwh.toFixed(1)),
    risk,
    recommendation,
    explanation: input.batteryAvailable
      ? "The scenario increases shortfall exposure, but storage remains the lowest intervention before backup."
      : "Battery availability is removed, so the recommendation shifts to the next feasible resource."
  };
}
