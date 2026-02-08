import React, { useState, useEffect } from "react";
import BookingList from "./components/BookingList";
import BookingForm from "./components/BookingForm";

// API Base URL (assuming proxy or CORS setup, for now hardcoded to backend port if running locally, or relative if proxied)
// In development with docker-compose, we might need to point to localhost:5000 if not proxying.
// But browsers run outside docker, so localhost:5000 works if port mapped.
const API_URL = "http://localhost:5001/api/bookings";

function App() {
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [editingBooking, setEditingBooking] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchBookings();
  }, []);

  const normalizeBooking = (booking) => ({
    id: booking.id,
    eventName: booking.event_name ?? booking.eventName ?? "",
    venueName: booking.venue_name ?? booking.venueName ?? "",
    date: booking.date,
    startTime: booking.start_time ?? booking.startTime ?? "",
    endTime: booking.end_time ?? booking.endTime ?? "",
    organizerName: booking.organizer_name ?? booking.organizerName ?? "",
    attendeeCount: booking.attendee_count ?? booking.attendeeCount ?? 0,
    notes: booking.notes ?? "",
  });

  const fetchBookings = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();
      const normalized = Array.isArray(data) ? data.map(normalizeBooking) : [];
      normalized.sort((a, b) => {
        if (a.date === b.date) {
          return a.startTime.localeCompare(b.startTime);
        }
        return a.date.localeCompare(b.date);
      });
      setBookings(normalized);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Could not load bookings. Please try again.");
    }
  };

  const handleSave = async (bookingData) => {
    try {
      setFormErrors({});
      let response;
      if (editingBooking) {
        // Update
        response = await fetch(`${API_URL}/${editingBooking.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData),
        });
      } else {
        // Create
        response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData),
        });
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (payload.fields) {
          setFormErrors(payload.fields);
        }
        throw new Error(payload.error || "Failed to save booking");
      }

      await fetchBookings();
      setView("list");
      setEditingBooking(null);
      setSuccessMsg(
        editingBooking
          ? "Booking updated successfully!"
          : "Booking created successfully!",
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save booking. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete booking");

      await fetchBookings();
      setSuccessMsg("Booking deleted successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to delete booking.");
    }
  };

  const startCreate = () => {
    setEditingBooking(null);
    setView("form");
    setFormErrors({});
  };

  const startEdit = (booking) => {
    setEditingBooking(booking);
    setView("form");
    setFormErrors({});
  };

  const cancelForm = () => {
    setView("list");
    setEditingBooking(null);
    setFormErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Event Booking System
          </h1>
          {view === "list" && (
            <button onClick={startCreate} className="btn-primary">
              + New Booking
            </button>
          )}
        </header>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{successMsg}</span>
          </div>
        )}

        {view === "list" ? (
          <BookingList
            bookings={bookings}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        ) : (
          <BookingForm
            bookingToEdit={editingBooking}
            onSave={handleSave}
            onCancel={cancelForm}
            serverErrors={formErrors}
          />
        )}
      </div>
    </div>
  );
}

export default App;
