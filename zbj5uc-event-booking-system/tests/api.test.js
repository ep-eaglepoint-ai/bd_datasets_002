const axios = require("axios");

const API_URL = process.env.API_URL || "http://localhost:5000/api/bookings";

describe("Booking API", () => {
  // Increase timeout for Docker cold starts
  jest.setTimeout(70000);

  let createdBookingId;
  const createdIds = [];

  const buildBooking = (overrides = {}) => ({
    eventName: "Community Workshop",
    venueName: "Conference Room A",
    date: "2026-02-10",
    startTime: "09:00",
    endTime: "10:30",
    organizerName: "Alex Johnson",
    attendeeCount: 25,
    notes: "Bring projectors and snacks",
    ...overrides,
  });

  test("should start with an empty list or existing list", async () => {
    // Retry logic for service startup
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await axios.get(API_URL);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        return;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  });

  test("should create a new booking", async () => {
    const newBooking = buildBooking({
      eventName: "Test Meeting",
      date: "2026-02-11",
    });

    const response = await axios.post(API_URL, newBooking);
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("id");
    expect(response.data.event_name).toBe(newBooking.eventName);

    createdBookingId = response.data.id;
    createdIds.push(createdBookingId);
  });

  test("should create multiple bookings", async () => {
    const bookings = [
      buildBooking({
        eventName: "Board Meeting",
        date: "2026-02-12",
        startTime: "13:00",
        endTime: "14:00",
      }),
      buildBooking({
        eventName: "Art Class",
        venueName: "Main Hall",
        date: "2026-02-13",
        startTime: "15:00",
        endTime: "16:30",
      }),
      buildBooking({
        eventName: "Yoga Session",
        venueName: "Studio 2",
        date: "2026-02-14",
        startTime: "08:00",
        endTime: "09:00",
      }),
      buildBooking({
        eventName: "Tech Meetup",
        venueName: "Conference Room B",
        date: "2026-02-15",
        startTime: "18:00",
        endTime: "20:00",
      }),
    ];

    for (const booking of bookings) {
      const response = await axios.post(API_URL, booking);
      expect(response.status).toBe(201);
      createdIds.push(response.data.id);
    }
  });

  test("should retrieve the created booking", async () => {
    expect(createdBookingId).toBeDefined();

    const response = await axios.get(`${API_URL}/${createdBookingId}`);
    expect(response.status).toBe(200);
    expect(response.data.event_name).toBe("Test Meeting");
  });

  test("should return 404 for missing booking", async () => {
    try {
      await axios.get(`${API_URL}/9999999`);
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

  test("should update the booking", async () => {
    expect(createdBookingId).toBeDefined();

    const updatedData = buildBooking({
      eventName: "Updated Meeting",
      date: "2026-02-16",
      startTime: "11:00",
      endTime: "12:00",
      attendeeCount: 40,
    });

    const response = await axios.put(
      `${API_URL}/${createdBookingId}`,
      updatedData,
    );
    expect(response.status).toBe(200);
    expect(response.data.event_name).toBe("Updated Meeting");
  });

  test("should delete the booking", async () => {
    expect(createdBookingId).toBeDefined();

    const response = await axios.delete(`${API_URL}/${createdBookingId}`);
    expect(response.status).toBe(200);

    // Verify it's gone
    const listResponse = await axios.get(API_URL);
    const booking = listResponse.data.find((b) => b.id === createdBookingId);
    expect(booking).toBeUndefined();
  };);

  test("should return 404 when deleting a non-existent booking", async () => {
    try {
      await axios.delete(`${API_URL}/9999999`);
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

  test("should validate required fields on create", async () => {
    try {
      await axios.post(API_URL, {
        notes: "Missing fields",
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.fields).toBeDefined();
    }
  });

  test("should validate attendee count and time/date formats", async () => {
    try {
      await axios.post(
        API_URL,
        buildBooking({
          attendeeCount: "abc",
          date: "02-10-2026",
          startTime: "25:00",
        }),
      );
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.fields.attendeeCount).toBeDefined();
    }
  });

  test("should validate end time after start time", async () => {
    try {
      await axios.post(
        API_URL,
        buildBooking({ startTime: "11:00", endTime: "10:00" }),
      );
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.fields.endTime).toBeDefined();
    }
  });

  test("should accept max length event name and notes", async () => {
    const longName = "A".repeat(200);
    const longNotes = "B".repeat(500);
    const response = await axios.post(
      API_URL,
      buildBooking({ eventName: longName, notes: longNotes }),
    );
    expect(response.status).toBe(201);
    createdIds.push(response.data.id);
  });
});
