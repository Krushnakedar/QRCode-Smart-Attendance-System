import { useState } from "react";
import Input from "../component/Input";
import MapModal from "../component/MapModal";
import QRCodeModal from "../component/QRCodeModal";
import scheduleImg from "../../public/scheduleImg.jpg";
import logo from "../../public/trackAS.png";
import { supabase } from "../utils/supabaseClient";
import useUserDetails from "../hooks/useUserDetails";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

// Environment variable must be declared first
const VERCEL_URL = import.meta.env.VITE_VERCEL_URL;

const ClassSchedule = () => {
  const { userDetails } = useUserDetails();

  const [formData, setFormData] = useState({
    courseTitle: "",
    courseCode: "",
    lectureVenue: "",
    time: "",
    date: "",
    note: "",
  });

  const [selectedLocationCordinate, setSelectedLocationCordinate] =
    useState(null);
  const [qrData, setQrData] = useState("");
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (locationName, coordinate) => {
    setFormData({ ...formData, lectureVenue: locationName });
    setSelectedLocationCordinate(coordinate);
  };

  const lecturerId = userDetails?.lecturer_id;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLocationCordinate) {
      toast.error("Please select a lecture venue location.");
      return;
    }

    const locationGeography = `SRID=4326;POINT(${selectedLocationCordinate.lng} ${selectedLocationCordinate.lat})`;
    const { courseTitle, courseCode, lectureVenue, time, date, note } =
      formData;

    try {
      // Insert class into Supabase and get the generated ID
      const { data, error } = await supabase
        .from("classes")
        .insert([
          {
            course_title: courseTitle,
            course_code: courseCode,
            time: new Date(`${date}T${time}`).toISOString(),
            date: new Date(date).toISOString(),
            location: locationGeography,
            latitude: selectedLocationCordinate.lat,
            longitude: selectedLocationCordinate.lng,
            note: note,
            qr_code: "", // placeholder
            lecturer_id: lecturerId,
            location_name: lectureVenue,
          },
        ])
        .select("id");

      if (error) throw error;

      const newClassId = data[0].id;

      // Generate registration link dynamically AFTER we have the class ID
      const registrationLink = `${VERCEL_URL}/attendance?classId=${encodeURIComponent(
        newClassId
      )}&time=${encodeURIComponent(time)}&courseCode=${encodeURIComponent(
        courseCode
      )}&lat=${selectedLocationCordinate.lat}&lng=${
        selectedLocationCordinate.lng
      }`;

      // Generate QR code as Data URL
      const qrCodeDataUrl = await new Promise((resolve) => {
        const svgContainer = document.createElement("div");
        const qrCodeElement = <QRCodeSVG value={registrationLink} size={256} />;
        import("react-dom/client").then((ReactDOM) => {
          ReactDOM.createRoot(svgContainer).render(qrCodeElement);
          setTimeout(() => {
            const svgString = new XMLSerializer().serializeToString(
              svgContainer.querySelector("svg")
            );
            const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
            resolve(dataUrl);
          }, 0);
        });
      });

      // Update class record with QR code
      await supabase
        .from("classes")
        .update({ qr_code: qrCodeDataUrl })
        .eq("id", newClassId);

      setQrData(registrationLink);
      setIsQRModalOpen(true);
      toast.success("Class schedule created successfully");
    } catch (err) {
      console.error(err);
      toast.error(`Error creating class: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row max-h-[100vh] bg-gray-100">
      <div className="w-full md:w-1/2 p-4 flex flex-col justify-center relative">
        <div>
          <Link to="/classDetails">
            <button className="btn btn-sm rounded-full bg-blue-500 border-none text-white">
              Back
            </button>
          </Link>
        </div>

        <div className="w-full max-w-2xl h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center mb-2">
            <img src={logo} alt="logo" />
          </div>

          <p className="text-sm text-neutral-600 text-center mb-1">
            Schedule a class using the form below
          </p>
          <form onSubmit={handleSubmit} className="py-0">
            <Input
              label="Course Title"
              name="courseTitle"
              type="text"
              value={formData.courseTitle}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Course Code"
              name="courseCode"
              type="text"
              value={formData.courseCode}
              onChange={handleInputChange}
              required
            />

            <div className="relative">
              <Input
                label="Lecture Venue"
                name="lectureVenue"
                type="text"
                value={formData.lectureVenue}
                placeholder="Select location"
                readOnly
                required
              />
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="btn absolute right-0 top-9 px-3 bg-green-500 text-white rounded-r-md hover:bg-green-600 transition-colors"
              >
                Select Location
              </button>
            </div>

            <Input
              name="time"
              type="time"
              label="Time"
              value={formData.time}
              onChange={handleInputChange}
              required
            />
            <Input
              name="date"
              type="date"
              label="Date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Note"
              name="note"
              type="text"
              value={formData.note}
              onChange={handleInputChange}
            />

            <button
              type="submit"
              className="w-full btn bg-blue-500 text-white hover:bg-blue-600 transition-colors mt-4"
            >
              Generate QR Code
            </button>
          </form>
        </div>
      </div>

      <div className="hidden md:flex w-1/2 h-screen items-center justify-center overflow-hidden">
        <img
          src={scheduleImg}
          alt="Student"
          className="object-cover w-full h-full max-w-none"
        />
      </div>

      {isMapModalOpen && (
        <MapModal
          onClose={() => setIsMapModalOpen(false)}
          onSelectLocation={handleLocationChange}
        />
      )}
      {isQRModalOpen && (
        <QRCodeModal qrData={qrData} onClose={() => setIsQRModalOpen(false)} />
      )}
    </div>
  );
};

export default ClassSchedule;
