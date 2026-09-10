import json
import time

t0 = time.time()
with open('data/reconciliation_records.json', 'r', encoding='utf-8-sig') as f:
    records = json.load(f)
with open('data/datapay_summary.json', 'r', encoding='utf-8-sig') as f:
    summary = json.load(f)

print(f"Loaded {len(records)} records.")

out_js = f"window.RECON_SUMMARY = {json.dumps(summary, ensure_ascii=False)};\nwindow.RECON_RECORDS = {json.dumps(records, ensure_ascii=False, separators=(',', ':'))};\n"

with open('data/reconciliation_data.js', 'w', encoding='utf-8') as f:
    f.write(out_js)

with open('web/data/reconciliation_data.js', 'w', encoding='utf-8') as f:
    f.write(out_js)

size_mb = len(out_js.encode('utf-8')) / (1024 * 1024)
print(f"Successfully generated minified reconciliation_data.js ({size_mb:.2f} MB) in {time.time() - t0:.2f}s")
