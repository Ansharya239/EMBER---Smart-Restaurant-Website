import asyncio
import random
from fastapi import HTTPException
from .parking_data import get_branch_inventory

# Global lock to prevent race conditions during in-memory allocation
allocation_lock = asyncio.Lock()

async def get_availability(branch_id: str):
    branch_data = get_branch_inventory(branch_id)
    slots = branch_data["slots"].values()
    return {
        "car": sum(1 for s in slots if s["vehicle_type"] == "car" and s["status"] == "available"),
        "bike": sum(1 for s in slots if s["vehicle_type"] == "bike" and s["status"] == "available")
    }

async def get_all_slots(branch_id: str):
    branch_data = get_branch_inventory(branch_id)
    return list(branch_data["slots"].values())

async def reserve_space(reservation_id: str, branch_id: str, vehicle_type: str, allocation_mode: str, accessible_required: bool, slot_id: str = None):
    async with allocation_lock:
        branch_data = get_branch_inventory(branch_id)
        
        if reservation_id in branch_data["reservations"]:
            raise HTTPException(status_code=400, detail="Reservation ID already has a parking space allocated.")

        available_slots = [
            s for s in branch_data["slots"].values()
            if s["status"] == "available" and s["vehicle_type"] == vehicle_type
        ]

        if allocation_mode == "manual":
            if not slot_id:
                raise HTTPException(status_code=400, detail="slot_id is required for manual allocation.")
            if slot_id not in branch_data["slots"]:
                raise HTTPException(status_code=404, detail="Slot does not exist.")
            
            target_slot = branch_data["slots"][slot_id]
            if target_slot["status"] != "available":
                raise HTTPException(status_code=400, detail="Slot is not available.")
            if target_slot["vehicle_type"] != vehicle_type:
                raise HTTPException(status_code=400, detail="Vehicle type mismatch.")
            if target_slot["is_accessible"] != accessible_required:
                raise HTTPException(status_code=403, detail="Please select a slot matching your parking requirement.")
            
            selected_slot = target_slot

        elif allocation_mode == "random":
            # Filter based on accessibility requirement
            valid_slots = [s for s in available_slots if s["is_accessible"] == accessible_required]
            if not valid_slots:
                raise HTTPException(status_code=404, detail=f"No {'accessible ' if accessible_required else ''}{vehicle_type} parking available.")
            
            selected_slot = random.choice(valid_slots)
        
        else:
            raise HTTPException(status_code=400, detail="Invalid allocation mode.")

        # Update state
        selected_slot["status"] = "reserved"
        branch_data["reservations"][reservation_id] = selected_slot["id"]

        return selected_slot

async def get_reservation(branch_id: str, reservation_id: str):
    branch_data = get_branch_inventory(branch_id)
    if reservation_id not in branch_data["reservations"]:
        raise HTTPException(status_code=404, detail="Parking reservation not found.")
    
    slot_id = branch_data["reservations"][reservation_id]
    return branch_data["slots"][slot_id]

async def cancel_reservation(branch_id: str, reservation_id: str):
    async with allocation_lock:
        branch_data = get_branch_inventory(branch_id)
        if reservation_id not in branch_data["reservations"]:
            raise HTTPException(status_code=404, detail="Parking reservation not found.")
        
        slot_id = branch_data["reservations"].pop(reservation_id)
        branch_data["slots"][slot_id]["status"] = "available"
        return {"status": "success", "message": f"Slot {slot_id} released."}