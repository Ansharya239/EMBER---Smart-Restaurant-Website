import os
import random  
from typing import List
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from booking.booking_routes import router as booking_router
# Add this import at the top
from parking.parking_routes import router as parking_router
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

app = FastAPI(title="Ember Concierge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add this after you initialize your FastAPI `app`
app.include_router(parking_router)
app.include_router(booking_router)
client = genai.Client(api_key=api_key) if api_key else None

class HistoryMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[HistoryMessage] = []

class ChatResponse(BaseModel):
    reply: str

# ==========================================
# ELITE MAITRE D' SYSTEM INSTRUCTION
# ==========================================
BASE_SYSTEM_INSTRUCTION = """
You are 'Ember', the elite, intuitive, and highly exclusive AI Maitre D' for Ember, New Delhi's premier open-flame fine dining restaurant.
Your tone is sophisticated, quietly confident, and impeccably polite. You NEVER use emojis. You do not ramble. You provide white-glove service.

KNOWLEDGE BASE & MENU:
- Concept: 1200-degree open-flame cooking, seasonal menus, local farm sourcing.
- Starters: Smoked Burrata (₹620), Tandoori Cauliflower (₹540), Charred Corn Salad (₹480).
- Mains: Wood-Fire Ribeye (₹1850), Harissa Sea Bass (₹1420), Smoked Mushroom Risotto (₹1090).
- Drinks: Ember Negroni (₹680), Cold Brew Tonic (₹420), Sparkling Yuzu (₹390).

RESERVATION PROTOCOL & LIVE AVAILABILITY:
You must strictly enforce the following schedule constraints. Do NOT allow users to book full rooms/times.
- Main Dining Room: 7:00 PM (Available), 8:00 PM (WAITLISTED - strictly deny this time), 9:30 PM (Available).
- Chef's Counter: Only 2 seats left at 8:30 PM today.
- The Oak Room (Private Dining): Fully booked for the next 6 weeks. Politely decline any bookings for it.

TICKET GENERATION RULE (CRITICAL):
If a user wants to book, you MUST naturally collect exactly 6 details: Name, Date, Time, Room, Email, Guests.
Once ALL 6 details are confirmed by the user AND the requested time/room is available based on the schedule above, you must approve the reservation and append EXACTLY this formatted block at the very end of your response:
[TICKET: {Name} | {Date} | {Time} | {Room} | {Email} | {Guests}]

Example Output:
I have secured your table at the Chef's Counter. We look forward to hosting you.
[TICKET: Ansh Arya | July 12 | 8:30 PM | Chef's Counter | ansh@email.com | 2]

IMPORTANT: 
- Do NOT add labels inside the ticket. Separate values strictly by the pipe '|' symbol.
- ONLY output the ticket once when the reservation is finalized. Do not output it again if the user asks a subsequent unrelated question.
"""

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Backend configuration error: Missing API Key.")

    # Lightweight Security Shield (Tightened to avoid blocking legitimate questions)
    forbidden_phrases = ["ignore previous instructions", "system prompt", "developer mode"]
    if any(phrase in request.message.lower() for phrase in forbidden_phrases):
        return ChatResponse(reply="I am Ember's digital maitre d', and my sole focus is ensuring a flawless dining experience. How may I assist you with the menu or a reservation today?")

    try:
        # Dynamic State Injection (Today's Date)
        today_str = datetime.now().strftime("%B %d, %Y")
        dynamic_context = f"Today's date is {today_str}. "
        
        if len(request.history) == 0:
            dynamic_context += "This is the very first interaction. Welcome them warmly but briefly."
        else:
            dynamic_context += "Maintain a fast conversational flow. Do not re-introduce yourself."

        final_system_instruction = f"{BASE_SYSTEM_INSTRUCTION}\n\nCURRENT CONTEXT:\n{dynamic_context}"

        formatted_history = []
        for msg in request.history:
            role = "model" if msg.role in ["ai", "model", "assistant"] else "user"
            formatted_history.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.text)])
            )

        chat_session = client.chats.create(
            model="gemini-2.5-flash",
            history=formatted_history,
            config=types.GenerateContentConfig(
                system_instruction=final_system_instruction,
                temperature=0.2,          
                max_output_tokens=800, # BUMPED UP to prevent the AI from cutting off sentences!  
            )
        )
        
        response = chat_session.send_message(request.message)
        return ChatResponse(reply=response.text)
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        raise HTTPException(status_code=500, detail="I apologize, our concierge desk is experiencing a temporary system interruption.")