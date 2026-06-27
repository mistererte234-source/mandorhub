import pandas as pd
import urllib.request
import json
import datetime
import time

def main():
    print("Reading Excel...")
    df = pd.read_excel('f:\\MandorHub\\docs\\Timeline Gapura 2026.xlsx')
    
    # Authenticate as Mandor
    print("Authenticating as Mandor...")
    phone = "0820000002"
    
    req1 = urllib.request.Request(
        'https://mandorhub.vercel.app/api/auth/request-otp',
        data=json.dumps({'phone': phone}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res1 = json.loads(urllib.request.urlopen(req1).read().decode('utf-8'))
    dev_code = res1['dev_code']
    
    req2 = urllib.request.Request(
        'https://mandorhub.vercel.app/api/auth/verify-otp',
        data=json.dumps({'phone': phone, 'code': dev_code}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res2 = json.loads(urllib.request.urlopen(req2).read().decode('utf-8'))
    token = res2['access_token']
    
    print("Fetching dashboard...")
    req_dash = urllib.request.Request(
        'https://mandorhub.vercel.app/api/dashboard',
        headers={'Authorization': 'Bearer ' + token}
    )
    res_dash = json.loads(urllib.request.urlopen(req_dash).read().decode('utf-8'))
    
    site_id = res_dash['sites'][0]['site_id']
    print(f"Site ID: {site_id}")
    
    success = 0
    for idx, row in df.iterrows():
        date_val = row.iloc[1]
        tukang = row.iloc[2]
        kuli = row.iloc[3]
        progres = row.iloc[4]
        
        if pd.isna(date_val) or not isinstance(date_val, datetime.datetime):
            continue
            
        report_date = date_val.strftime('%Y-%m-%d')
        work_done = str(progres) if not pd.isna(progres) else ""
        tukang = int(tukang) if not pd.isna(tukang) else 0
        kuli = int(kuli) if not pd.isna(kuli) else 0
        
        payload = {
            "site_id": site_id,
            "work_done": work_done,
            "target_status": "tercapai",
            "report_date": report_date,
            "worker_attendance": [
                {"role": "Tukang", "count": tukang, "names": ""},
                {"role": "Kuli", "count": kuli, "names": ""}
            ]
        }
        
        import requests
        
        req_headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
        
        for attempt in range(3):
            try:
                res = requests.post('https://mandorhub.vercel.app/api/reports', json=payload, headers=req_headers)
                if res.status_code == 200 or res.status_code == 201:
                    print(f"Report for {report_date} created: {work_done}")
                    success += 1
                    break
                else:
                    if attempt == 2:
                        print(f"Failed to create report for {report_date}: {res.status_code} - {res.text}")
                    time.sleep(2)
            except Exception as e:
                if attempt == 2:
                    print(f"Exception for {report_date}: {e}")
                time.sleep(2)
        time.sleep(0.5)
            
    print(f"Done! Created {success} reports.")

if __name__ == "__main__":
    main()
