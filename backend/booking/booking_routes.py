from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .booking_service import (
    create_booking,
    get_booking,
    cancel_booking_parking
)


router = APIRouter(
    prefix="/api/bookings",
    tags=["Combined Bookings"]
)


class BookingRequest(BaseModel):

    name: str = Field(..., min_length=2)

    email: str

    guests: int = Field(..., ge=1, le=20)

    date: str

    time: str

    room: Literal[
        "Main Dining Room",
        "Chef's Counter",
        "The Oak Room"
    ]

    branch_id: str

    special_requests: Optional[str] = ""

    vehicle_type: Literal[
        "car",
        "bike",
        "other"
    ] = "other"

    parking_required: bool = False

    accessible_required: bool = False

    allocation_mode: Optional[
        Literal["manual", "random"]
    ] = None

    slot_id: Optional[str] = None


@router.post("/confirm", status_code=201)
async def confirm_booking(request: BookingRequest):

    data = (
        request.model_dump()
        if hasattr(request, "model_dump")
        else request.dict()
    )

    return await create_booking(data)


@router.get("/{booking_id}")
async def retrieve_booking(booking_id: str):

    return await get_booking(booking_id)


@router.delete("/{booking_id}/parking")
async def remove_booking_parking(booking_id: str):

    return await cancel_booking_parking(booking_id)