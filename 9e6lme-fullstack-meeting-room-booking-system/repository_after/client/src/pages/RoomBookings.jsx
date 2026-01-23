import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../components/AuthContext';

const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9 AM to 6 PM

function formatTime(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour;
  return `${h}:00 ${suffix}`;
}

function formatDateTime(date, hour) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function getBookingForHour(bookings, hour) {
  for (const booking of bookings) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    if (start.getHours() <= hour && end.getHours() > hour) {
      return booking;
    }
  }
  return null;
}

export default function RoomBookings() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Booking form state
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [id, selectedDate]);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRoomBookings(id, selectedDate);
      setRoom(data.room);
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setBookingError('');
    setBookingSuccess('');
    setSubmitting(true);

    try {
      const startTime = `${selectedDate}T${bookingStart}:00`;
      const endTime = `${selectedDate}T${bookingEnd}:00`;

      await api.createBooking(parseInt(id), startTime, endTime);
      setBookingSuccess('Booking confirmed!');
      setBookingStart('');
      setBookingEnd('');
      loadBookings();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isPastDate = new Date(selectedDate) < new Date(new Date().toDateString());
  const isWeekend = () => {
    const d = new Date(selectedDate);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  if (loading && !room) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error && !room) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{room?.name}</h1>
        <p className="text-gray-600">Capacity: {room?.capacity} people</p>
      </div>

      {/* Date picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isWeekend() && (
          <p className="text-orange-600 text-sm mt-1">
            Note: Bookings are only available Monday-Friday
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Schedule */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Schedule for {selectedDate}</h2>
          
          <div className="space-y-2">
            {HOURS.map((hour) => {
              const booking = getBookingForHour(bookings, hour);
              return (
                <div
                  key={hour}
                  className={`flex items-center p-3 rounded ${
                    booking
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="w-24 text-sm font-medium">{formatTime(hour)}</div>
                  <div className="flex-1">
                    {booking ? (
                      <span className="text-red-700">
                        Booked by {booking.booker_name}
                      </span>
                    ) : (
                      <span className="text-green-700">Available</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking form */}
        {!isPastDate && !isWeekend() && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Book this room</h2>

            {!user && (
              <p className="text-gray-600 mb-4">
                Please{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline"
                >
                  login
                </button>{' '}
                to make a booking.
              </p>
            )}

            {bookingError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {bookingSuccess}
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <select
                  value={bookingStart}
                  onChange={(e) => setBookingStart(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!user}
                >
                  <option value="">Select start time</option>
                  {HOURS.map((hour) => (
                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {formatTime(hour)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <select
                  value={bookingEnd}
                  onChange={(e) => setBookingEnd(e.target.value)}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!user}
                >
                  <option value="">Select end time</option>
                  {HOURS.slice(1).map((hour) => (
                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {formatTime(hour)}
                    </option>
                  ))}
                  <option value="18:00">6:00 PM</option>
                </select>
              </div>

              <div className="text-sm text-gray-500">
                <p>• Minimum booking: 15 minutes</p>
                <p>• Maximum booking: 4 hours</p>
                <p>• Operating hours: 9:00 AM - 6:00 PM</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !user}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Booking...' : 'Book Room'}
              </button>
            </form>
          </div>
        )}

        {isPastDate && (
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-600">
              This is a past date. Bookings are read-only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
