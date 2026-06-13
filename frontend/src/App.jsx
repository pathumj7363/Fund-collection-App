import { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Search, 
  Download, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Wallet,
  Users
} from 'lucide-react';
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
  const [showWaModal, setShowWaModal] = useState(false);
  const [waMessage, setWaMessage] = useState('');
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
      setModalMessage("Failed to update payment");
      setModalType('alert');
      setShowModal(true);
    }
  };

  const safeStudents = students || [];
  // Calculate dashboard stats
  const paidCount = safeStudents.filter(s => s.status === 'paid').length;
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

  const sendWhatsAppReminders = async () => {
    try {
      await axios.post('http://localhost:5000/api/whatsapp/remind', {
        month: selectedMonth,
        message: waMessage
      });
      alert("Messages have been sent to unpaid students!");
      setShowWaModal(false);
      setWaMessage('');
    } catch(error) {
      console.error(error);
      alert("Error sending messages. Is the WhatsApp client ready?");
    }
  };

  const handleDownloadClick = () => {
    setModalType('downloadSelect');
    setModalMessage('Which report would you like to download?');
    setShowModal(true);
  };

  const generateSummaryReport = () => {
    const doc = new jsPDF();
    const currentYear = new Date().getFullYear();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Top Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // App Logo/Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BATCH FUND COLLECTION REPORT", 14, 25);
    
    // Statement Period Details
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Statement Period: ${selectedMonth} ${currentYear}`, 14, 55);
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(14, 60, pageWidth - 14, 60);

    // Summary Box
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(14, 70, pageWidth - 28, 90, 3, 3, 'FD');
    
    // Box Title
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text("ACCOUNT OVERVIEW", 20, 82);
    
    // Details
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    
    const detailsLeft = 20;
    const detailsRight = pageWidth / 2 + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Department:", detailsLeft, 95);
    doc.setFont("helvetica", "normal");
    doc.text("Software Engineering", detailsLeft + 30, 95);
    
    doc.setFont("helvetica", "bold");
    doc.text("Student Status:", detailsLeft, 105);
    doc.setFont("helvetica", "normal");
    doc.text("Boys", detailsLeft + 35, 105);
    
    doc.setFont("helvetica", "bold");
    doc.text("Total Students:", detailsRight, 95);
    doc.setFont("helvetica", "normal");
    doc.text(`${safeStudents.length}`, detailsRight + 35, 95);
    
    doc.setFont("helvetica", "bold");
    doc.text("Paid Students:", detailsRight, 105);
    doc.setFont("helvetica", "normal");
    doc.text(`${paidCount}`, detailsRight + 35, 105);

    // Total Collection Highlight
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.line(20, 115, pageWidth - 20, 115);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total Collection:", 20, 135);
    
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald 500
    doc.text(`LKR ${totalCollected.toLocaleString()}`, detailsRight, 135);
    
    // Footer Page 1
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Page 1 of 1`, pageWidth / 2, 280, { align: 'center' });

    doc.save(`Summary_Report_${selectedMonth}_${currentYear}.pdf`);
    setShowModal(false);
  };

  const generateLedgerReport = () => {
    const doc = new jsPDF();
    const currentYear = new Date().getFullYear();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Page Header
    doc.setFillColor(139, 92, 246); // Violet 500
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`DETAILED PAYMENT LEDGER - ${selectedMonth.toUpperCase()} ${currentYear}`, 14, 13);
    
    // Table
    const tableColumn = ["ID", "Student Name", "Fee Amount", "Status"];
    const tableRows = [];

    safeStudents.forEach(student => {
      const studentData = [
        student.id,
        student.name,
        `LKR ${FEE_AMOUNT}`,
        student.status.toUpperCase()
      ];
      tableRows.push(studentData);
    });

    let dynamicFontSize = 10;
    let dynamicPadding = 4;
    
    if (safeStudents.length > 15) {
       dynamicFontSize = Math.max(6, 12 - Math.ceil(safeStudents.length / 10)); 
       dynamicPadding = Math.max(1, 5 - Math.ceil(safeStudents.length / 15)); 
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'striped',
      styles: {
        fontSize: dynamicFontSize,
        cellPadding: dynamicPadding
      },
      headStyles: { 
        fillColor: [15, 23, 42], // Slate 900
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: function(data) {
        // Color the Status column text
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'PAID') {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [244, 63, 94]; // Rose
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Page 1 of 1`, pageWidth / 2, 280, { align: 'center' });

    doc.save(`Ledger_Report_${selectedMonth}_${currentYear}.pdf`);
    setShowModal(false);
  };

  const filteredStudents = safeStudents.filter(student => {
    const matchesFilter = filter === 'all' || student.status === filter;
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <div className="app-bar glass">
        <Wallet size={28} color="var(--primary)" />
        <h1>Fund Flow</h1>
      </div>

      <div className="container">
        {/* Dashboard Section */}
        <div className="dashboard-card glass">
          <h2>LKR {totalCollected.toLocaleString()}</h2>
          <p>
            Collected in {selectedMonth} <br/>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '4px', display: 'inline-block' }}>
              <Users size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              {paidCount} of {safeStudents.length} Paid
            </span>
          </p>
        </div>

        {/* Search Bar */}
        <div className="search-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Month & Status Filters */}
        <div className="filters-row">
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleDownloadClick} className="btn btn-primary" style={{ flex: 1 }}>
              <Download size={20} />
              Download Reports
            </button>
            <button onClick={() => setShowWaModal(true)} className="btn btn-primary" style={{ flex: 1 }}>
               Notify Unpaid
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleFinalize} className="btn btn-danger" style={{ flex: 1 }}>
              <Lock size={20} />
              Finalize {selectedMonth}
            </button>
            <button onClick={() => setShowWaModal(true)} className="btn btn-primary" style={{ flex: 1 }}>
               Notify Unpaid
            </button>
          </div>
        )}

        {/* Student List */}
        <div className="student-list">
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No students found</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            filteredStudents.map(student => (
              <div key={student.id} className="student-card glass">
                <div className="student-info">
                  <div className="student-avatar">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="student-details">
                    <h2>{student.name}</h2>
                    <p>
                      {student.status === 'paid' ? (
                        <CheckCircle2 size={14} color="var(--success)" />
                      ) : (
                        <XCircle size={14} color="var(--danger)" />
                      )}
                      <span style={{ color: student.status === 'paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 500, textTransform: 'capitalize' }}>
                        {student.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
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
          <div className="modal-overlay">
            <div className="modal-content">
              <div className={`modal-icon ${modalType === 'confirmFinalize' ? 'danger' : ''}`}>
                {modalType === 'confirmFinalize' ? <AlertTriangle size={32} /> : 
                 modalType === 'downloadSelect' ? <Download size={32} /> : <CheckCircle2 size={32} />}
              </div>
              <h3>{modalType === 'confirmFinalize' ? 'Confirm Action' : 
                   modalType === 'downloadSelect' ? 'Download Reports' : 'Notice'}</h3>
              <p>{modalMessage}</p>
              
              <div className="modal-actions" style={{ flexDirection: modalType === 'downloadSelect' ? 'column' : 'row' }}>
                {modalType === 'downloadSelect' ? (
                  <>
                    <button className="btn btn-primary" onClick={generateSummaryReport} style={{fontSize: '0.9rem', padding: '12px'}}>
                      Download Summary Report
                    </button>
                    <button className="btn btn-primary" onClick={generateLedgerReport} style={{fontSize: '0.9rem', padding: '12px'}}>
                      Download Ledger Report
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{padding: '12px'}}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      {modalType === 'confirmFinalize' ? 'Cancel' : 'Okay'}
                    </button>
                    {modalType === 'confirmFinalize' && (
                      <button 
                        className="btn btn-danger"
                        onClick={confirmFinalizeAction}
                      >
                        Finalize
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Notification Modal */}
        {showWaModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ color: 'white', marginBottom: '15px' }}>Send Reminders</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                This will automatically send a WhatsApp message to all students marked as "Unpaid" for {selectedMonth}.
              </p>
              
              <textarea 
                value={waMessage} 
                onChange={(e) => setWaMessage(e.target.value)} 
                placeholder="Type your WhatsApp message here..."
                style={{ 
                  width: '100%', height: '120px', marginBottom: '20px', padding: '15px',
                  backgroundColor: 'var(--surface)', color: 'white', border: '1px solid var(--border)',
                  borderRadius: '8px', fontSize: '1rem', resize: 'none'
                }}
              />
              
              <div className="modal-actions">
                <button onClick={() => setShowWaModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={sendWhatsAppReminders} className="btn btn-primary">
                  Send Messages
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
