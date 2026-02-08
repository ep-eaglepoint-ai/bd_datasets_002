import React, { useState, useEffect } from "react";

const BookingForm = ({
  bookingToEdit,
  onSave,
  onCancel,
  serverErrors = {},
}) => {
  const [formData, setFormData] = useState({
    eventName: "",
    venueName: "",
    date: "",
    startTime: "",
    endTime: "",
    organizerName: "",
    attendeeCount: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (bookingToEdit) {
      const dateObj = new Date(bookingToEdit.date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      setFormData({
        eventName: bookingToEdit.eventName,
        venueName: bookingToEdit.venueName,
        date: formattedDate,
        startTime: bookingToEdit.startTime,
        endTime: bookingToEdit.endTime,
        organizerName: bookingToEdit.organizerName,
        attendeeCount: String(bookingToEdit.attendeeCount || ""),
        notes: bookingToEdit.notes || "",
      });
    } else {
      setFormData({
        eventName: "",
        venueName: "",
        date: "",
        startTime: "",
        endTime: "",
        organizerName: "",
        attendeeCount: "",
        notes: "",
      });
    }
    setErrors({});
  }, [bookingToEdit]);

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  const validate = () => {
    const newErrors = {};
    const eventName = formData.eventName.trim();
    const venueName = formData.venueName.trim();
    const organizerName = formData.organizerName.trim();
    const attendeeCount = Number(formData.attendeeCount);

    if (!eventName) newErrors.eventName = "Event name is required.";
    if (eventName && eventName.length > 200)
      newErrors.eventName = "Event name must be 1-200 characters.";
    if (!venueName) newErrors.venueName = "Venue/room name is required.";
    if (!organizerName) newErrors.organizerName = "Organizer name is required.";
    if (!formData.date) newErrors.date = "Date is required.";
    if (!formData.startTime) newErrors.startTime = "Start time is required.";
    if (!formData.endTime) newErrors.endTime = "End time is required.";

    if (formData.startTime && formData.endTime) {
      if (formData.endTime <= formData.startTime) {
        newErrors.endTime = "End time must be after start time.";
      }
    }

    if (!Number.isInteger(attendeeCount) || attendeeCount <= 0) {
      newErrors.attendeeCount = "Attendee count must be a positive integer.";
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes must be 500 characters or less.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        eventName: formData.eventName.trim(),
        venueName: formData.venueName.trim(),
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        organizerName: formData.organizerName.trim(),
        attendeeCount: Number(formData.attendeeCount),
        notes: formData.notes.trim(),
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-xl font-bold mb-4">
        {bookingToEdit ? "Edit Booking" : "Create Booking"}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="eventName"
          >
            Event Name *
          </label>
          <input
            className={`input-field ${errors.eventName ? "border-red-500" : ""}`}
            id="eventName"
            name="eventName"
            type="text"
            placeholder="Community Workshop"
            value={formData.eventName}
            onChange={handleChange}
          />
          {errors.eventName && (
            <p className="text-red-500 text-xs italic">{errors.eventName}</p>
          )}
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="venueName"
          >
            Venue / Room Name *
          </label>
          <input
            className={`input-field ${errors.venueName ? "border-red-500" : ""}`}
            id="venueName"
            name="venueName"
            type="text"
            placeholder="Conference Room A"
            value={formData.venueName}
            onChange={handleChange}
          />
          {errors.venueName && (
            <p className="text-red-500 text-xs italic">{errors.venueName}</p>
          )}
        </div>
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="date"
            >
              Date *
            </label>
            <input
              className={`input-field ${errors.date ? "border-red-500" : ""}`}
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
            />
            {errors.date && (
              <p className="text-red-500 text-xs italic">{errors.date}</p>
            )}
          </div>
          <div className="w-full md:w-1/3">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="startTime"
            >
              Start Time *
            </label>
            <input
              className={`input-field ${errors.startTime ? "border-red-500" : ""}`}
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleChange}
            />
            {errors.startTime && (
              <p className="text-red-500 text-xs italic">{errors.startTime}</p>
            )}
          </div>
          <div className="w-full md:w-1/3">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="endTime"
            >
              End Time *
            </label>
            <input
              className={`input-field ${errors.endTime ? "border-red-500" : ""}`}
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleChange}
            />
            {errors.endTime && (
              <p className="text-red-500 text-xs italic">{errors.endTime}</p>
            )}
          </div>
        </div>
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="organizerName"
            >
              Organizer Name *
            </label>
            <input
              className={`input-field ${errors.organizerName ? "border-red-500" : ""}`}
              id="organizerName"
              name="organizerName"
              type="text"
              placeholder="Alex Johnson"
              value={formData.organizerName}
              onChange={handleChange}
            />
            {errors.organizerName && (
              <p className="text-red-500 text-xs italic">
                {errors.organizerName}
              </p>
            )}
          </div>
          <div className="w-full md:w-1/2">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="attendeeCount"
            >
              Attendee Count *
            </label>
            <input
              className={`input-field ${errors.attendeeCount ? "border-red-500" : ""}`}
              id="attendeeCount"
              name="attendeeCount"
              type="number"
              min="1"
              value={formData.attendeeCount}
              onChange={handleChange}
            />
            {errors.attendeeCount && (
              <p className="text-red-500 text-xs italic">
                {errors.attendeeCount}
              </p>
            )}
          </div>
        </div>
        <div className="mb-6">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="notes"
          >
            Additional Notes (Optional)
          </label>
          <textarea
            className={`input-field ${errors.notes ? "border-red-500" : ""}`}
            id="notes"
            name="notes"
            placeholder="Accessibility needs, setup details, etc."
            value={formData.notes}
            onChange={handleChange}
          ></textarea>
          {errors.notes && (
            <p className="text-red-500 text-xs italic">{errors.notes}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button className="btn-primary" type="submit">
            {bookingToEdit ? "Update Booking" : "Create Booking"}
          </button>
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
