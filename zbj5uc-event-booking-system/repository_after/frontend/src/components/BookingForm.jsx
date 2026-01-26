import React, { useState, useEffect } from 'react';

const BookingForm = ({ bookingToEdit, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '',
        description: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (bookingToEdit) {
            // Format date to YYYY-MM-DD for input
            const dateObj = new Date(bookingToEdit.date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            setFormData({
                title: bookingToEdit.title,
                date: formattedDate,
                time: bookingToEdit.time,
                description: bookingToEdit.description || '',
            });
        } else {
            setFormData({
                title: '',
                date: '',
                time: '',
                description: '',
            });
        }
    }, [bookingToEdit]);

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.time) newErrors.time = 'Time is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
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
            <h2 className="text-xl font-bold mb-4">{bookingToEdit ? 'Edit Booking' : 'Create Booking'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                        Event Title *
                    </label>
                    <input
                        className={`input-field ${errors.title ? 'border-red-500' : ''}`}
                        id="title"
                        name="title"
                        type="text"
                        placeholder="Event Title"
                        value={formData.title}
                        onChange={handleChange}
                    />
                    {errors.title && <p className="text-red-500 text-xs italic">{errors.title}</p>}
                </div>
                <div className="mb-4 flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
                            Date *
                        </label>
                        <input
                            className={`input-field ${errors.date ? 'border-red-500' : ''}`}
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleChange}
                        />
                        {errors.date && <p className="text-red-500 text-xs italic">{errors.date}</p>}
                    </div>
                    <div className="w-full md:w-1/2">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="time">
                            Time *
                        </label>
                        <input
                            className={`input-field ${errors.time ? 'border-red-500' : ''}`}
                            id="time"
                            name="time"
                            type="time"
                            value={formData.time}
                            onChange={handleChange}
                        />
                        {errors.time && <p className="text-red-500 text-xs italic">{errors.time}</p>}
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                        Description (Optional)
                    </label>
                    <textarea
                        className="input-field"
                        id="description"
                        name="description"
                        placeholder="Event Description"
                        value={formData.description}
                        onChange={handleChange}
                    ></textarea>
                </div>
                <div className="flex items-center justify-between">
                    <button
                        className="btn-primary"
                        type="submit"
                    >
                        {bookingToEdit ? 'Update Booking' : 'Create Booking'}
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
