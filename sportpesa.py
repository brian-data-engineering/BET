import requests
import yaml
from datetime import datetime

def fetch_sportpesa_results():
    # The POST endpoint you discovered
    url = "https://www.ke.sportpesa.com/api/results/search"
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.ke.sportpesa.com/results"
    }

    try:
        # Sending POST with empty body as required by the API
        response = requests.post(url, json={}, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        cleaned_data = []
        for item in data:
            # Converting Sportpesa's millisecond timestamp to a readable date
            start_ms = item.get('start_date', 0)
            readable_date = datetime.fromtimestamp(start_ms / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
            
            cleaned_data.append({
                "game_id": item.get("game_id"),
                "sport": item.get("sport_name"),
                "league": item.get("league"),
                "teams": f"{item.get('team1')} vs {item.get('team2')}",
                "result": item.get("result"),
                "start_time": readable_date
            })

        # Save to YAML file
        with open("results.yaml", "w") as f:
            yaml.dump(cleaned_data, f, default_flow_style=False, sort_keys=False)
            
        print(f"Success! Processed {len(cleaned_data)} matches.")

    except Exception as e:
        print(f"Execution Error: {e}")

if __name__ == "__main__":
    fetch_sportpesa_results()
