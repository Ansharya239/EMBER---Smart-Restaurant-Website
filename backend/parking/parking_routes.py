from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from . import parking_service

router = APIRouter(prefix="/api/parking", tags=["Smart Parking"])

class ReservationRequest(BaseModel):
    reservation_id: str
    branch_id: str
    vehicle_type: str
    allocation_mode: str
    slot_id: Optional[str] = None
    accessible_required: bool = False

@router.get("/availability")
async def check_availability(branch_id: str):
    return await parking_service.get_availability(branch_id)

@router.get("/slots")
async def get_slots(branch_id: str):
    return await parking_service.get_all_slots(branch_id)

@router.post("/reserve")
async def reserve_parking(req: ReservationRequest):
    return await parking_service.reserve_space(
        req.reservation_id,
        req.branch_id,
        req.vehicle_type,
        req.allocation_mode,
        req.accessible_required,
        req.slot_id
    )

@router.get("/reservations/{branch_id}/{reservation_id}")
async def retrieve_reservation(branch_id: str, reservation_id: str):
    return await parking_service.get_reservation(branch_id, reservation_id)

@router.delete("/reservations/{branch_id}/{reservation_id}")
async def cancel_parking(branch_id: str, reservation_id: str):
    return await parking_service.cancel_reservation(branch_id, reservation_id)