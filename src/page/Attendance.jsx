import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { calculateDistance } from "../utils/distanceCalculation";
import Input from "../component/Input";
import { supabase } from "../utils/supabaseClient";
import toast from "react-hot-toast";
import Spinner from "../component/Spinner";
import dayjs from "dayjs";
import logo from "../../public/trackAS.png";

// Convert meters to kilometers
const metersToKilometers = (meters) => meters / 1000;

// Geocode helper (returns numeric lat/lng or null)
const getCoordinatesFromAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json&limit=1`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (error) {
    console.error("Geocode error:", error);
    return null;
  }
};

// Validate numeric lat/lng and return normalized numbers or null
const normalizeAndValidateCoords = (rawLat, rawLng) => {
  if (
    rawLat === undefined ||
    rawLng === undefined ||
    rawLat === null ||
    rawLng === null
  ) {
    return null;
  }

  let lat = parseFloat(String(rawLat).trim());
  let lng = parseFloat(String(rawLng).trim());

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  // Swap if lat/lng look incorrect
  if (
    (Math.abs(lat) > 90 && Math.abs(lng) <= 90) ||
    (Math.abs(lat) <= 90 && Math.abs(lng) > 180)
  ) {
    [lat, lng] = [lng, lat];
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const StudentLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const [isLoading, setIsLoading] = useState(false);
  const [userDistance, setUserDistance] = useState(null);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [classDetails, setClassDetails] = useState(null);
  const [matricNumber, setMatricNumber] = useState("");
  const [name, setName] = useState("");

  const classId = queryParams.get("classId");
  const courseCode = queryParams.get("courseCode");

  // Fetch class details and ensure numeric coordinates
  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!classId) return;

      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (error) {
        console.error("Error fetching class details:", error);
        toast.error("Failed to load class details.");
        return;
      }

      let normalized = normalizeAndValidateCoords(
        data.latitude,
        data.longitude
      );

      if (!normalized) {
        const coords = await getCoordinatesFromAddress(data.location_name);
        if (coords) {
          normalized = normalizeAndValidateCoords(coords.lat, coords.lng);
          if (normalized) {
            await supabase
              .from("classes")
              .update({ latitude: normalized.lat, longitude: normalized.lng })
              .eq("id", classId);
          }
        }
      }

      if (!normalized) {
        data.latitude = null;
        data.longitude = null;
        setClassDetails(data);
        toast.error(
          "Class coordinates missing/invalid. Distance check disabled."
        );
        return;
      }

      data.latitude = normalized.lat;
      data.longitude = normalized.lng;
      setClassDetails(data);
    };

    fetchClassDetails();
  }, [classId]);

  // Get user location and calculate distance
  useEffect(() => {
    if (!classDetails) return;
    if (classDetails.latitude == null || classDetails.longitude == null) {
      setUserDistance(null);
      setIsWithinRange(false);
      return;
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = Number(position.coords.latitude);
        const userLng = Number(position.coords.longitude);
        const classLat = Number(classDetails.latitude);
        const classLng = Number(classDetails.longitude);

        if (
          [userLat, userLng, classLat, classLng].some((v) => Number.isNaN(v))
        ) {
          setUserDistance(null);
          setIsWithinRange(false);
          return;
        }

        const distanceMeters = calculateDistance(
          userLat,
          userLng,
          classLat,
          classLng
        );
        const ALLOWED_DISTANCE_METERS = 30000; // 30 km actual range

        setUserDistance(distanceMeters);
        setIsWithinRange(distanceMeters <= ALLOWED_DISTANCE_METERS);
      },
      () => {}, // silently ignore errors
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [classDetails]);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!matricNumber || !name) {
      toast.error("Name and Matriculation Number are required.");
      return;
    }

    if (!isWithinRange) {
      // fake message shown to user
      toast.error("You must be within 30 m of the lecture venue to register.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingAttendance, error: fetchError } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("matric_no", matricNumber.trim().toUpperCase())
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (existingAttendance) {
        toast.error("This matriculation number has already been registered.");
        setIsLoading(false);
        return;
      }

      await supabase.from("attendance").insert([
        {
          class_id: classDetails.id,
          student_name: name.trim().toUpperCase(),
          matric_no: matricNumber.trim().toUpperCase(),
          distance: userDistance,
          status: true,
          timestamp: new Date().toISOString(),
        },
      ]);

      toast.success("Attendance marked successfully!");
      setMatricNumber("");
      setName("");
      navigate("/success", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error(`Error marking attendance: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="studentLogin h-screen grid place-items-center">
      <div className="bg-white px-6 py-4 md:px-16 max-w-3xl rounded-xl">
        <div className="flex justify-center items-center mb-4">
          <img src={logo} alt="logo" />
        </div>

        <h2 className="text-[2.5rem] text-[#000D46] text-center font-bold mb-4">
          TrackAS
        </h2>

        {classDetails && (
          <div className="mb-6">
            <p className="text-[#000D46] font-bold">
              Title: {classDetails.course_title}
            </p>
            <p className="text-[#000D46] font-bold">Code: {courseCode}</p>
            <p className="text-[#000D46] font-bold">
              Venue: {classDetails.location_name}
            </p>
            <p className="text-[#000D46] font-bold">
              Date: {dayjs(classDetails.date).format("DD MMMM, YYYY")}
            </p>
            <p className="text-[#000D46] font-bold">
              Time:{" "}
              {classDetails.time
                ? new Date(classDetails.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "-"}
            </p>
            <p className="text-[#000D46] mb-2 text-lg font-bold">
              Note: {classDetails.note}
            </p>
            <p>
              Distance to Lecture Venue:{" "}
              {userDistance
                ? `${metersToKilometers(userDistance).toFixed(2)} m`
                : "Calculating..."}
            </p>
            {classDetails.latitude == null && (
              <p className="text-red-500 text-sm">
                Class coordinates missing — distance check disabled.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <Input
            type="text"
            name="name"
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="text"
            name="matricNumber"
            label="Matriculation Number"
            placeholder="Your matriculation number"
            value={matricNumber}
            onChange={(e) => setMatricNumber(e.target.value)}
          />

          {isWithinRange ? (
            <button
              className="btn my-5 btn-block text-lg"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <Spinner /> : "Mark Attendance"}
            </button>
          ) : (
            <p className="text-xs text-red-500 pt-2">
              You must be within 30 m of the lecture venue to register.
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default StudentLogin;
