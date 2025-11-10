import { CloseCircle } from "iconsax-react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import toast from "react-hot-toast";

/* eslint-disable react/prop-types */
const AttendanceListModal = ({ isOpen, selectedClass, onClose }) => {
  const [attendees, setAttendees] = useState([]);

  // Fetch attendees from Supabase
  const fetchAttendees = async () => {
    if (!selectedClass?.id) return;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("class_id", selectedClass.id)
      .order("timestamp", { ascending: true });

    if (error) {
      toast.error(`Error fetching attendees: ${error.message}`);
    } else {
      setAttendees(data || []);
    }
  };

  // Fetch when modal opens or selectedClass changes
  useEffect(() => {
    if (isOpen) {
      fetchAttendees();

      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchAttendees();
      }, 5000);

      return () => clearInterval(interval); // Cleanup
    }
  }, [isOpen, selectedClass]);

  if (!isOpen || !selectedClass) return null;

  // Export to CSV
  const exportToCSV = () => {
    if (attendees.length === 0) return;

    const csvRows = [
      ["Name", "Matric No", "Attended At"],
      ...attendees.map((attendee) => [
        attendee.student_name,
        attendee.matric_no,
        new Date(attendee.timestamp).toLocaleString([], {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ]),
    ];

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `attendance_list_${new Date().toISOString()}.csv`);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (attendees.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(
      attendees.map((attendee) => ({
        Name: attendee.student_name,
        Matric_No: attendee.matric_no,
        Attended_At: new Date(attendee.timestamp).toLocaleString([], {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `attendance_list_${new Date().toISOString()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg relative h-[80vh] overflow-hidden">
        <h2 className="text-xl font-bold underline mb-4 text-black">
          Attendance List
        </h2>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 hover:text-red-500 text-black"
        >
          <CloseCircle variant="Bold" />
        </button>

        {/* Export buttons */}
        <div className="absolute top-10 right-3 flex space-x-2">
          <button
            onClick={exportToCSV}
            className="btn btn-xs font-bold text-white bg-blue-500 border-none"
          >
            Export CSV
          </button>
          <button
            onClick={exportToExcel}
            className="btn btn-xs font-bold text-white bg-green-500 border-none"
          >
            Export Excel
          </button>
        </div>

        {/* List container */}
        <div className="overflow-y-auto max-h-[60vh] pr-2 scrollbar-hidden mt-16">
          {attendees.length > 0 ? (
            attendees.map((attendee, index) => {
              const formattedTimestamp = new Date(
                attendee.timestamp
              ).toLocaleString([], {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={attendee.id || index}
                  className="mb-4 border-b pb-2 flex items-start"
                >
                  <span className="text-black text-sm font-semibold mr-2">
                    {index + 1}.
                  </span>
                  <div>
                    <p className="text-black uppercase text-sm font-semibold">
                      Name: {attendee.student_name}
                    </p>
                    <p className="text-black uppercase text-sm font-semibold">
                      Matric No: {attendee.matric_no}
                    </p>
                    <p className="text-gray-800 text-sm">
                      Attended At: {formattedTimestamp}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-black text-center mt-4">
              No attendees found for this class.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceListModal;
