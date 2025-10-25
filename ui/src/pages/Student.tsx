import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Student = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [proficiency, setProficiency] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleProficiencySave = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    await fetch('http://localhost:8000/student/set-proficiency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ proficiency_level: proficiency }),
    });
    setSaving(false);
    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-2xl font-semibold mt-20">Student workflow</div>
      <div className="mt-4 text-muted-foreground">Set your proficiency and take personalized tests below.</div>
      <div className="mt-8">
        <label htmlFor="proficiency" className="block mb-2 font-medium">Select your proficiency level:</label>
        <select
          id="proficiency"
          value={proficiency}
          onChange={e => { setProficiency(e.target.value); setSuccess(false); }}
          className="px-4 py-2 rounded border"
        >
          <option value="">-- Select --</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <Button
          className="mt-4"
          onClick={handleProficiencySave}
          disabled={!proficiency || saving}
        >
          {saving ? 'Saving...' : 'Save Proficiency'}
        </Button>
        {success && <div className="mt-2 text-green-600">Proficiency saved!</div>}
      </div>
      <Button className="mt-8" onClick={() => navigate('/test')}>Take Personalized Test</Button>
      <Button className="mt-8" onClick={async () => { await logout(); navigate('/login'); }}>Logout</Button>
    </div>
  );
};

export default Student;
