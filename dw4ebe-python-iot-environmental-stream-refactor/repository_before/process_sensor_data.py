# filename: process_sensor_data.py

import math
from datetime import datetime

# PROBLEM: Global magic numbers for calibration offsets and thresholds
TEMP_MAX_C = 55.0
MOISTURE_MIN = 10.0


def process_telemetry_batch(raw_readings):
    """
    LEGACY MONOLITHIC PROCESSOR
    Input: List of dicts [{'id': 'S1', 'model': 'Alpha', 'val': 22.5, 'type': 'temp', 'unit': 'C'}]
    """
    processed_results = []
    alerts = []

    for reading in raw_readings:
        # PROBLEM 1: Direct object mutation and scattered validation
        val = reading.get('val')
        if val is None or not isinstance(val, (int, float)):
            continue

        # PROBLEM 2: Hardcoded Calibration Logic per model
        if reading.get('model') == 'Alpha':
            # Model Alpha has a systematic drift of +1.5 units
            val = val - 1.5
        elif reading.get('model') == 'Beta':
            # Model Beta requires logarithmic scaling for CO2 sensors
            if reading.get('type') == 'co2':
                val = math.log10(val) * 10 if val > 0 else 0
            else:
                val = val + 0.8

        # PROBLEM 3: Mixed Unit Conversion Logic
        if reading.get('type') == 'temp' and reading.get('unit') == 'F':
            # F to C conversion
            val = (val - 32) * (5/9)
        
        # PROBLEM 4: Tightly coupled alert thresholds
        if reading.get('type') == 'temp' and val > TEMP_MAX_C:
            alerts.append(f"CRITICAL_HEAT: Sensor {reading.get('id')} reported {round(val, 2)}C")
        
        if reading.get('type') == 'moisture' and val < MOISTURE_MIN:
            alerts.append(f"DRY_SOIL: Sensor {reading.get('id')} reported {round(val, 2)}%")

        processed_results.append({
            'sensor_id': reading.get('id'),
            'normalized_value': round(val, 2),
            'timestamp': datetime.now().isoformat()
        })

    # PROBLEM 5: Returns mixed result types and calculates stats synchronously
    if not processed_results:
        return {'data': [], 'stats': {'avg': 0}}

    avg_val = sum(r['normalized_value'] for r in processed_results) / len(processed_results)
    
    return {
        'data': processed_results,
        'alerts': alerts,
        'summary': {
            'average': round(avg_val, 2),
            'count': len(processed_results)
        }
    }