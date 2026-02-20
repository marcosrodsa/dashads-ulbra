import urllib.request
import json
import os

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print("Environment variables missing!")
    exit(1)

url = f"{supabase_url}/functions/v1/seed-knowledge"
headers = {
    'Authorization': f'Bearer {supabase_key}',
    'Content-Type': 'application/json'
}

req = urllib.request.Request(url, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
