import asyncio
import uuid
from copy import deepcopy
from datetime import datetime, timezone, date, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from parking import parking_service


BOOKINGS = {}
BOOKING_LOCK = asyncio.Lock()

INDIA_TZ = ZoneInfo("Asia/Kolkata")


def validate_dining_booking(data):

    try:
        booking_date = date.fromisoformat(data["date"])
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Date must use YYYY-MM-DD format."
        )

    today = datetime.now(INDIA_TZ).date()

    if booking_date < today:
        raise HTTPException(
            status_code=400,
            detail="Past dates cannot be booked."
        )

    room = data["room"]
    time = data["time"]
    guests = data["guests"]

    if room == "Main Dining Room":

        allowed_times = ["7:00 PM", "9:30 PM"]

        if time == "8:00 PM":
            raise HTTPException(
                status_code=409,
                detail="The Main Dining Room is waitlisted at 8:00 PM."
            )

        if time not in allowed_times:
            raise HTTPException(
                status_code=409,
                detail="This dining time is not available."
            )

    elif room == "Chef's Counter":

        if booking_date != today or time != "8:30 PM":
            raise HTTPException(
                status_code=409,
                detail="The Chef's Counter demo availability is 8:30 PM today only."
            )

        booked_seats = sum(
            booking["reservation"]["guests"]
            for booking in BOOKINGS.values()
            if booking["status"] == "confirmed"
            and booking["reservation"]["room"] == "Chef's Counter"
            and booking["reservation"]["date"] == data["date"]
            and booking["reservation"]["time"] == time
        )

        if booked_seats + guests > 2:
            raise HTTPException(
                status_code=409,
                detail="The Chef's Counter has no remaining seats."
            )

    elif room == "The Oak Room":

        if booking_date <= today + timedelta(days=42):
            raise HTTPException(
                status_code=409,
                detail="The Oak Room is fully booked for the next six weeks."
            )

    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid dining room."
        )


async def create_booking(data):

    async with BOOKING_LOCK:

        validate_dining_booking(data)

        parking_required = data["parking_required"]

        booking_id = (
            "EMB-" + uuid.uuid4().hex[:10].upper()
        )

        branch_id = data["branch_id"].strip().upper()

        parking_details = None

        if parking_required:

            vehicle_type = data["vehicle_type"]

            if vehicle_type not in ["car", "bike"]:

                raise HTTPException(
                    status_code=400,
                    detail="Parking currently supports cars and bikes only."
                )

            if data["allocation_mode"] not in ["manual", "random"]:

                raise HTTPException(
                    status_code=400,
                    detail="Select a valid parking allocation method."
                )

            slot = await parking_service.reserve_space(
                booking_id,
                branch_id,
                vehicle_type,
                data["allocation_mode"],
                data["accessible_required"],
                data.get("slot_id")
            )

            parking_details = {
                "slot_id": slot["id"],
                "vehicle_type": vehicle_type,
                "distance": slot["distance"],
                "floor": slot["floor"],
                "zone": slot["zone"],
                "accessible": slot["is_accessible"],
                "status": "confirmed"
            }

        booking = {

            "booking_id": booking_id,

            "reservation": {
                "name": data["name"],
                "email": data["email"],
                "guests": data["guests"],
                "date": data["date"],
                "time": data["time"],
                "room": data["room"],
                "branch_id": branch_id,
                "special_requests": data.get(
                    "special_requests", ""
                )
            },

            "parking": parking_details,

            "status": "confirmed",

            "created_at": datetime.now(
                timezone.utc
            ).isoformat()

        }

        BOOKINGS[booking_id] = booking

        return deepcopy(booking)


async def get_booking(booking_id):

    async with BOOKING_LOCK:

        booking = BOOKINGS.get(booking_id)

        if not booking:
            raise HTTPException(
                status_code=404,
                detail="Booking not found."
            )

        return deepcopy(booking)


async def cancel_booking_parking(booking_id):

    async with BOOKING_LOCK:

        booking = BOOKINGS.get(booking_id)

        if not booking:
            raise HTTPException(
                status_code=404,
                detail="Booking not found."
            )

        if not booking["parking"]:
            raise HTTPException(
                status_code=400,
                detail="This booking has no parking reservation."
            )

        if booking["parking"]["status"] == "cancelled":
            return deepcopy(booking)

        await parking_service.cancel_reservation(
            booking["reservation"]["branch_id"],
            booking_id
        )

        booking["parking"]["status"] = "cancelled"

        return deepcopy(booking)