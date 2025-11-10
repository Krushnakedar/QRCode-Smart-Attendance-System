import toast from "react-hot-toast";
import { supabase } from "../utils/supabaseClient";
import useUserDetails from "../hooks/useUserDetails";
import { useEffect, useState } from "react";
import AttendanceListModal from "../component/AttendanceListModal";
import { Link } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
import Footer from "../component/Footer";

const PreviousClass = () => {
  const { userDetails } = useUserDetails();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const lecturerId = userDetails?.lecturer_id;

  // Fetch classes with attendees
  const fetchClasses = async () => {
    if (!lecturerId) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("lecturer_id", lecturerId)
      .order("date", { ascending: false });

    if (error) {
      toast.error(`Error fetching class data: ${error.message}`);
    } else {
      // Ensure attendees array exists for each class
      const classesWithAttendees = data.map((cls) => ({
        ...cls,
        attendees: cls.attendees || [],
      }));
      setClasses(classesWithAttendees);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, [lecturerId]);

  // Open attendance modal
  const handleViewAttendance = (classItem) => {
    setSelectedClass(classItem);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClass(null);
  };

  return (
    <>
      <section className="pb-20 pt-8 px-6 max-w-7xl mx-auto h-[calc(100vh-6rem)]">
        <div className="flex items-center mb-6">
          <Link to="/classDetails">
            <button className="btn btn-sm rounded-full bg-blue-500 border-none text-white flex items-center">
              <BiArrowBack className="mr-1" />
              <span className="hidden xs:inline">Back</span>
            </button>
          </Link>
          <h2 className="text-center mx-auto font-bold text-2xl text-black">
            List of Previous Classes
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="loading loading-spinner bg-blue-500"></div>
          </div>
        ) : classes.length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto">
            {/* Table header */}
            <div className="grid grid-cols-7 gap-4 mb-6 text-[0.7rem] md:text-base font-bold text-black">
              <div>S/N</div>
              <div>Course Code</div>
              <div>Course Title</div>
              <div>Date</div>
              <div>Time</div>
              <div>Total Attendance</div>
              <div>View Attendance</div>
            </div>

            {/* Table rows */}
            {classes.map((classItem, index) => {
              const formattedDate = classItem.date
                ? new Date(classItem.date).toLocaleDateString()
                : "-";
              const formattedTime = classItem.time
                ? new Date(classItem.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-";

              return (
                <div
                  key={classItem.id}
                  className="grid grid-cols-7 gap-4 mb-4 border-b pb-2 text-sm md:text-base text-neutral-700"
                >
                  <div>{index + 1}</div>
                  <div>{classItem.course_code || "-"}</div>
                  <div>{classItem.course_title || "-"}</div>
                  <div>{formattedDate}</div>
                  <div>{formattedTime}</div>
                  <div>{classItem.attendees?.length || 0}</div>
                  <div>
                    <button
                      onClick={() => handleViewAttendance(classItem)}
                      className="btn btn-sm font-bold text-white bg-green-500 border-none"
                    >
                      View List
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-black mt-4">
            No previous classes found.
          </p>
        )}

        {/* Attendance Modal */}
        <AttendanceListModal
          isOpen={isModalOpen}
          selectedClass={selectedClass}
          onClose={handleCloseModal}
        />
      </section>
      <Footer />
    </>
  );
};

export default PreviousClass;
