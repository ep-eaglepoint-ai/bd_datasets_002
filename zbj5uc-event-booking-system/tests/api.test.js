const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api/bookings';

describe('Booking API', () => {
    // Increase timeout for Docker cold starts
    jest.setTimeout(70000);

    let createdBookingId;

    test('should start with an empty list or existing list', async () => {
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
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    });

    test('should create a new booking', async () => {
        const newBooking = {
            title: 'Test Meeting',
            date: '2023-10-27',
            time: '14:00',
            description: 'Discuss project roadmap'
        };

        const response = await axios.post(API_URL, newBooking);
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data.title).toBe(newBooking.title);

        createdBookingId = response.data.id;
    });

    test('should retrieve the created booking', async () => {
        expect(createdBookingId).toBeDefined();

        // We get all bookings and find ours because we didn't implement GET /bookings/:id in the frontend requirements explicitly, 
        // but backend might have GET /bookings. 
        // Wait, requirements said "Display all relevant booking information".
        // My backend routes didn't implement GET /bookings/:id. Let's check routes.js.
        // It implements GET /bookings, POST, PUT /bookings/:id, DELETE /bookings/:id.
        // So I should fetch all and find it.

        const response = await axios.get(API_URL);
        const booking = response.data.find(b => b.id === createdBookingId);
        expect(booking).toBeDefined();
        expect(booking.title).toBe('Test Meeting');
    });

    test('should update the booking', async () => {
        expect(createdBookingId).toBeDefined();

        const updatedData = {
            title: 'Updated Meeting',
            date: '2023-10-28',
            time: '15:00',
            description: 'Updated description'
        };

        const response = await axios.put(`${API_URL}/${createdBookingId}`, updatedData);
        expect(response.status).toBe(200);
        expect(response.data.title).toBe('Updated Meeting');
    });

    test('should delete the booking', async () => {
        expect(createdBookingId).toBeDefined();

        const response = await axios.delete(`${API_URL}/${createdBookingId}`);
        expect(response.status).toBe(200);

        // Verify it's gone
        const listResponse = await axios.get(API_URL);
        const booking = listResponse.data.find(b => b.id === createdBookingId);
        expect(booking).toBeUndefined();
    });

    test('should validate required fields on create', async () => {
        try {
            await axios.post(API_URL, {
                description: 'Missing fields'
            });
        } catch (error) {
            expect(error.response.status).toBe(400);
        }
    });
});
