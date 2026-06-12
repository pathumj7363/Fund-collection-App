import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function App() {
  const [students, setStudents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const FEE_AMOUNT = 10; // $10 per month

  // Fetch students and their status whenever the month changes
  useEffect(() => {
    fetchStudents();
  }, [selectedMonth]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/students/${selectedMonth}`);
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const togglePayment = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';

    try {
      // Send update to the backend
      await axios.post('http://localhost:5000/api/payments', {
        student_id: studentId,
        month: selectedMonth,
        status: newStatus
      });

      // Update the local state so the UI reflects the change immediately
      setStudents(students.map(student =>
        student.id === studentId ? { ...student, status: newStatus } : student
      ));
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment");
    }
  };

  // Calculate dashboard stats
  const paidCount = students.filter(s => s.status === 'paid').length;
  const totalCollected = paidCount * FEE_AMOUNT;

  return (
    <>
      <div className="app-bar">
        <h1>Fund Collection App</h1>
      </div>

      <div className="container">
        {/* Dashboard Section */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--success)' }}>${totalCollected}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Collected in {selectedMonth} ({paidCount}/{students.length} Paid)
          </p>
        </div>

        {/* Month Selector */}
        <select
          className="month-selector"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {MONTHS.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>

        {/* Student List */}
        <div>
          {students.map(student => (
            <div key={student.id} className="student-card">
              <div className="student-info">
                <h2>{student.name}</h2>
                <p>Monthly Fee: ${FEE_AMOUNT}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`status-text ${student.status === 'paid' ? 'status-paid' : 'status-unpaid'}`}>
                  {student.status}
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={student.status === 'paid'}
                    onChange={() => togglePayment(student.id, student.status)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
