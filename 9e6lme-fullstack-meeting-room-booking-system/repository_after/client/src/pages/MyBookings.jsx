import { useState, useEffect } from 'react';
import { api } from '../api/client';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await api.getMyBookings();
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelling(id);
    try {
      await api.cancelBooking(id);
      loadBookings();
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date();

  if (loading) {
    return <div className="text-center py-8">Loading your bookings...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && !isPast(b.start_time)
  );
  const pastBookings = bookings.filter(
    (b) => b.status !== 'confirmed' || isPast(b.start_time)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-600">You don't have any bookings yet.</p>
        </div>
      ) : (
        <>
          {/* Upcoming bookings */}
          {upcomingBookings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-medium">{booking.room_name}</h3>
                      <p className="text-gray-600 text-sm">
                        {formatDate(booking.start_time)}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {formatTime(booking.start_time)} -{' '}
                        {formatTime(booking.end_time)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancelling === booking.id}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    >
                      {cancelling === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past/cancelled bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-500">
                Past & Cancelled
              </h2>
              <div className="space-y-3">
                {pastBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-gray-100 rounded-lg p-4 opacity-75"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{booking.room_name}</h3>
                        <p className="text-gray-600 text-sm">
                          {formatDate(booking.start_time)}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {formatTime(booking.start_time)} -{' '}
                          {formatTime(booking.end_time)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {booking.status === 'cancelled' ? 'Cancelled' : 'Past'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
