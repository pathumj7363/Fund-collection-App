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
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const FEE_AMOUNT = 100; // LKR 100 per month

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

  const filteredStudents = students.filter(student => {
    const matchesFilter = filter === 'all' || student.status === filter;
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <div className="app-bar">
        <h1>Batch Fund Collector</h1>
      </div>

      <div className="container">
        {/* Dashboard Section */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--success)' }}>LKR {totalCollected}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Collected in {selectedMonth} ({paidCount}/{students.length} Paid)
          </p>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-wrapper">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="search-icon"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Month & Status Filters */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          <select
            className="month-selector"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTHS.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          <select
            className="month-selector"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Students</option>
            <option value="paid">Paid Only</option>
            <option value="unpaid">Unpaid Only</option>
          </select>
        </div>

        {/* Student List */}
        <div>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No students found</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            filteredStudents.map(student => (
              <div key={student.id} className="student-card">
                <div className="student-info">
                  <h2>{student.name}</h2>
                  <p>Monthly Fee: LKR {FEE_AMOUNT}</p>
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
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default App;
