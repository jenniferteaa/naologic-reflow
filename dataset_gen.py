from openai import OpenAI
import json

client = OpenAI(api_key="")

WORK_CENTERS = ["TX320", "FX240", "PZ510", "KX100", "MZ750", "RQ430"]

system_prompt = """You are a manufacturing data generator. Generate work orders in exact JSON format.

Each work order MUST follow this exact nested structure:
{
  "docId": "WO1",
  "docType": "workOrder",
  "data": {
    "workOrderNumber": "WO1",
    "manufacturingOrderId": "MO1",
    "workCenterId": "TX320",
    "startDate": "2026-03-03T08:00:00Z",
    "endDate": "2026-03-03T09:30:00Z",
    "durationMinutes": 90,
    "isMaintenance": false,
    "dependsOnWorkOrderIds": []
  }
}

Rules:
- docId format: "WO{number}"
- docType: always "workOrder"
- data.workCenterId: one of TX320, FX240, PZ510, KX100, MZ750, RQ430
- data.startDate/endDate: ISO UTC strings between 2026-03-03 and 2026-03-10
- data.durationMinutes: between 30 and 240
- data.isMaintenance: roughly 5% true, rest false
- data.dependsOnWorkOrderIds: realistic chains, some empty, some referencing earlier WO ids
- data.manufacturingOrderId: one of MO1, MO2
- data.workOrderNumber: same as docId

Return ONLY a valid JSON array, no explanation, no markdown, no backticks."""

def generate_batch(start_id: int, count: int, max_dep_id: int) -> list:
    user_prompt = f"""Generate exactly {count} work orders, with docIds from WO{start_id} to WO{start_id + count - 1}.

Dependencies can only reference WO IDs between WO1 and WO{max_dep_id}.
Make a mix of:
- Some with no dependencies (independent orders)
- Some with 1 parent (linear chains)
- Some with 2 parents (converging chains)
- Some that are depended on by multiple children

Return ONLY a JSON array of {count} work order objects in the nested data structure format."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=16000
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


# --- Generate in batches ---
all_work_orders = []
batch_size = 50
total = 500

for i in range(0, total, batch_size):
    start_id = i + 1
    max_dep_id = max(1, i)

    print(f"Generating WO{start_id} to WO{start_id + batch_size - 1}...")

    try:
        batch = generate_batch(start_id, batch_size, max_dep_id)
        all_work_orders.extend(batch)
        print(f"  ✓ Got {len(batch)} work orders")
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        continue

print(f"\nTotal generated: {len(all_work_orders)}")

with open("large-work-orders.json", "w") as f:
    json.dump(all_work_orders, f, indent=2)

print("Saved to large-work-orders.json")

print("\nSample:")
print(json.dumps(all_work_orders[:2], indent=2))