import random

# In-memory storage: { branch_id: { "slots": { slot_id: slot_data }, "reservations": { res_id: slot_id } } }
inventory_db = {}

def calculate_distance(slot_num: int) -> float:
    if slot_num <= 5:
        return 5.0 + (slot_num - 1) * 1.25
    elif slot_num == 6:
        return 12.0
    else:
        return round(12.0 + (slot_num - 6) * 1.9, 2)

def generate_slots(vehicle_type: str, prefix: str):
    slots = {}
    for i in range(1, 27):
        slot_id = f"{prefix}{i:02d}"
        is_accessible = i <= 5
        
        # Randomize initial state: 60% available, 30% occupied, 10% reserved
        status_choice = random.choices(
            ["available", "occupied", ], 
            weights=[0.65, 0.35], 
            k=1
        )[0]

        slots[slot_id] = {
            "id": slot_id,
            "vehicle_type": vehicle_type,
            "status": status_choice,
            "distance": calculate_distance(i),
            "is_accessible": is_accessible,
            "floor": "Ground Floor",
            "zone": "Accessible" if is_accessible else "Standard"
        }
    return slots

def get_branch_inventory(branch_id: str):
    if branch_id not in inventory_db:
        inventory_db[branch_id] = {
            "slots": {
                **generate_slots("car", "C"),
                **generate_slots("bike", "B")
            },
            "reservations": {}
        }
    return inventory_db[branch_id]