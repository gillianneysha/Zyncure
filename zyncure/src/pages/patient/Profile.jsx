import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
  let navigate = useNavigate();

  function handleLogout() {
    sessionStorage.removeItem('token');
    navigate('/')
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-4 text-myHeader text-left">Profile</h1>

      <button onClick={handleLogout}>Logout</button>
    </>
  );
}