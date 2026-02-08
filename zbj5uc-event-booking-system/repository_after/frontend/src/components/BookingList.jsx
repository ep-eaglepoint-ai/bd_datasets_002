import React from "react";

const BookingList = ({ bookings, onEdit, onDelete }) => {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 text-center">
        <p className="text-gray-600 text-lg">No bookings found.</p>
        <p className="text-gray-500">Create a new booking to get started.</p>
      </div>
    );
  }

  const handleDeleteClick = (booking) => {
    if (window.confirm(`Are you sure you want to delete "${booking.title}"?`)) {
      onDelete(booking.id);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200"
        >
          <div className="px-6 py-4">
            <div className="font-bold text-xl mb-2 text-blue-800">
              {booking.eventName}
            </div>
            <p className="text-gray-700 text-base mb-2">
              <span className="font-semibold">Venue:</span> {booking.venueName}
            </p>
            <p className="text-gray-700 text-base mb-2">
              <span className="font-semibold">Date:</span>{" "}
              {formatDate(booking.date)}
            </p>
            <p className="text-gray-700 text-base mb-2">
              <span className="font-semibold">Time:</span> {booking.startTime} -{" "}
              {booking.endTime}
            </p>
            <p className="text-gray-700 text-base mb-2">
              <span className="font-semibold">Organizer:</span>{" "}
              {booking.organizerName}
            </p>
            <p className="text-gray-700 text-base mb-2">
              <span className="font-semibold">Attendees:</span>{" "}
              {booking.attendeeCount}
            </p>
            {booking.notes && (
              <p className="text-gray-700 text-base mb-4">
                <span className="font-semibold">Notes:</span> {booking.notes}
              </p>
            )}
          </div>
          <div className="px-6 pt-4 pb-4 flex justify-end gap-2 bg-gray-50">
            <button
              onClick={() => onEdit(booking)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm transition"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteClick(booking)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm transition"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookingList;
