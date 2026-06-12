import { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './index.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function App() {
  const [students, setStudents] = useState([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState(''); // Can be 'confirmFinalize' or 'alert'
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
      if (Array.isArray(response.data)) {
        setStudents(response.data);
        setIsFinalized(false);
      } else {
        setStudents(response.data.students || []);
        setIsFinalized(response.data.isFinalized || false);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const togglePayment = async (studentId, currentStatus) => {
    if (isFinalized) {
      setModalMessage("This month is finalized and cannot be edited.");
      setModalType('alert');
      setShowModal(true);
      return;
    }

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

  const handleFinalize = () => {
    setModalMessage(`Are you sure you want to finalize collections for ${selectedMonth}? This action cannot be undone.`);
    setModalType('confirmFinalize');
    setShowModal(true);
  };

  const confirmFinalizeAction = async () => {
    try {
      await axios.post('http://localhost:5000/api/finalize', { month: selectedMonth });
      setIsFinalized(true);
      setModalMessage(`${selectedMonth} collection has been finalized.`);
      setModalType('alert');
    } catch (error) {
      console.error("Error finalizing:", error);
      setModalMessage("Failed to finalize month. Is the backend running?");
      setModalType('alert');
    }
  };

  const generateReport = () => {
    const doc = new jsPDF();
    const currentYear = new Date().getFullYear();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(`Batch fund - ${selectedMonth}/${currentYear}`, 14, 22);

    // Details
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Department: software engineering`, 14, 32);
    doc.text(`Student status: boys`, 14, 40);
    doc.text(`Paid Students: ${paidCount}`, 14, 48);
    doc.text(`Total Collection: LKR ${totalCollected}`, 14, 56);

    // Table
    const tableColumn = ["ID", "Name", "Fee Amount", "Status"];
    const tableRows = [];

    students.forEach(student => {
      const studentData = [
        student.id,
        student.name,
        `LKR ${FEE_AMOUNT}`,
        student.status.toUpperCase()
      ];
      tableRows.push(studentData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      theme: 'grid',
      headStyles: { fillColor: [187, 134, 252] },
    });

    doc.save(`Batch_Fund_Report_${selectedMonth}_${currentYear}.pdf`);
  };

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
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '10px' }}>
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

        {/* Action Buttons */}
        {isFinalized ? (
          <button onClick={generateReport} className="download-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Report
          </button>
        ) : (
          <button onClick={handleFinalize} className="download-btn" style={{ background: 'linear-gradient(135deg, var(--danger), #ff8a65)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Finalize {selectedMonth}
          </button>
        )}

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
                      disabled={isFinalized}
                    />
                    <span className="slider" style={{ opacity: isFinalized ? 0.5 : 1, cursor: isFinalized ? 'not-allowed' : 'pointer' }}></span>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Custom UI Pop-up Modal */}
        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'var(--surface)', padding: '25px', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>{modalType === 'confirmFinalize' ? 'Confirm Action' : 'Notice'}</h3>
              <p style={{ marginBottom: '25px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{modalMessage}</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                {modalType === 'confirmFinalize' && (
                  <button 
                    onClick={confirmFinalizeAction}
                    style={{ padding: '10px 20px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Yes, Finalize
                  </button>
                )}
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {modalType === 'confirmFinalize' ? 'Cancel' : 'Okay'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
