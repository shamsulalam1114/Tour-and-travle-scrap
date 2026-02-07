import React, { useState } from "react";
import { Container, Box, Typography, Paper, Chip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { generateItinerary, getAIRecommendations } from "../utils/api";
import { useThemeMode } from "../context/ThemeContext";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaMoneyBillWave,
  FaHeart,
  FaPlaneDeparture,
  FaMagic,
  FaClock,
  FaUtensils,
  FaLandmark,
  FaHiking,
  FaShoppingBag,
  FaCamera,
  FaBed,
  FaBus,
  FaStar,
  FaLightbulb,
  FaChevronDown,
  FaChevronUp,
  FaRedo,
  FaSpinner,
  FaRoute,
  FaGlobeAmericas,
} from "react-icons/fa";

const INTEREST_OPTIONS = [
  { id: "culture", label: "Culture & History", icon: <FaLandmark />, color: "#667eea" },
  { id: "food", label: "Food & Dining", icon: <FaUtensils />, color: "#f5576c" },
  { id: "adventure", label: "Adventure", icon: <FaHiking />, color: "#4caf50" },
  { id: "shopping", label: "Shopping", icon: <FaShoppingBag />, color: "#ff9800" },
  { id: "photography", label: "Photography", icon: <FaCamera />, color: "#9c27b0" },
  { id: "relaxation", label: "Relaxation", icon: <FaBed />, color: "#00bcd4" },
];

const BUDGET_LEVELS = [
  { value: "budget", label: "Budget", desc: "Hostels, street food, public transport", icon: "💰", gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { value: "moderate", label: "Moderate", desc: "Mid-range hotels, restaurants", icon: "💎", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { value: "luxury", label: "Luxury", desc: "5-star hotels, fine dining, private tours", icon: "👑", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
];

const ACTIVITY_ICONS = {
  sightseeing: <FaCamera />,
  food: <FaUtensils />,
  culture: <FaLandmark />,
  adventure: <FaHiking />,
  shopping: <FaShoppingBag />,
  transport: <FaBus />,
  rest: <FaBed />,
  default: <FaMapMarkerAlt />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const TripPlanner = ({ onNavigate }) => {
  const { mode } = useThemeMode();
  const darkMode = mode === "dark";
  const [formData, setFormData] = useState({
    destination: "",
    from: "",
    days: 3,
    budget: "moderate",
    interests: [],
    travelers: 1,
  });
  const [itinerary, setItinerary] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [activeTab, setActiveTab] = useState("planner");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (id) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.destination) return;
    setLoading(true);
    setError(null);
    setItinerary(null);
    try {
      const data = await generateItinerary(formData);
      setItinerary(data.itinerary);
      setExpandedDay(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setError(null);
    try {
      const prefs = {
        budget: formData.budget,
        interests: formData.interests,
        travelers: formData.travelers,
        days: formData.days,
      };
      const data = await getAIRecommendations(prefs);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  const getActivityIcon = (type) => ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;

  return (
    <Box className={`trip-planner ${darkMode ? "dark" : ""}`}>
      {/* ── Hero Header ── */}
      <Box className="tp-hero">
        <div className="tp-hero-shape tp-shape-1" />
        <div className="tp-hero-shape tp-shape-2" />
        <div className="tp-hero-shape tp-shape-3" />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Box sx={{ textAlign: "center", py: { xs: 5, md: 7 } }}>
              <Chip
                icon={<FaMagic />}
                label="Powered by Gemini AI"
                sx={{
                  mb: 2,
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontWeight: 600,
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#fff", mb: 1.5, letterSpacing: "-1px", fontSize: { xs: "1.8rem", md: "2.5rem" } }}>
                AI Trip Planner
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: { xs: "0.95rem", md: "1.1rem" }, maxWidth: 540, mx: "auto", lineHeight: 1.7 }}>
                Create personalized travel itineraries in seconds. Just tell us where you want to go!
              </Typography>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ── Tab Navigation ── */}
      <Container maxWidth="lg">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Box className="tp-tabs">
            <button className={`tp-tab ${activeTab === "planner" ? "active" : ""}`} onClick={() => setActiveTab("planner")}>
              <FaRoute /> <span>Itinerary Planner</span>
            </button>
            <button className={`tp-tab ${activeTab === "recommendations" ? "active" : ""}`} onClick={() => setActiveTab("recommendations")}>
              <FaGlobeAmericas /> <span>Get Recommendations</span>
            </button>
          </Box>
        </motion.div>

        {/* ── Body ── */}
        <Box className="tp-body">
          {/* ── Form Panel ── */}
          <motion.div className="tp-form-section" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Paper elevation={0} className="tp-form" component="form" onSubmit={handleGenerate}>
              <Typography className="tp-form-title" variant="h6" sx={{ fontWeight: 700, mb: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
                <FaMagic style={{ color: "#667eea" }} /> Trip Details
              </Typography>

              <div className="tp-form-group">
                <label><FaMapMarkerAlt /> Destination</label>
                <div className="tp-input-wrapper">
                  <input type="text" value={formData.destination} onChange={(e) => handleChange("destination", e.target.value)} placeholder="e.g., Paris, Tokyo, Bali..." required />
                </div>
              </div>

              <div className="tp-form-group">
                <label><FaPlaneDeparture /> Traveling From</label>
                <div className="tp-input-wrapper">
                  <input type="text" value={formData.from} onChange={(e) => handleChange("from", e.target.value)} placeholder="e.g., New York, London..." />
                </div>
              </div>

              <div className="tp-form-row">
                <div className="tp-form-group">
                  <label><FaCalendarAlt /> Days</label>
                  <div className="tp-input-wrapper">
                    <input type="number" min={1} max={30} value={formData.days} onChange={(e) => handleChange("days", parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                <div className="tp-form-group">
                  <label><FaUsers /> Travelers</label>
                  <div className="tp-input-wrapper">
                    <input type="number" min={1} max={20} value={formData.travelers} onChange={(e) => handleChange("travelers", parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              </div>

              <div className="tp-form-group">
                <label><FaMoneyBillWave /> Budget Level</label>
                <div className="budget-options">
                  {BUDGET_LEVELS.map((b) => (
                    <button key={b.value} type="button" className={`budget-option ${formData.budget === b.value ? "selected" : ""}`} onClick={() => handleChange("budget", b.value)}>
                      <span className="budget-icon">{b.icon}</span>
                      <div className="budget-text">
                        <strong>{b.label}</strong>
                        <span>{b.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="tp-form-group">
                <label><FaHeart /> Interests</label>
                <div className="interest-options">
                  {INTEREST_OPTIONS.map((opt) => (
                    <button key={opt.id} type="button" className={`interest-chip ${formData.interests.includes(opt.id) ? "selected" : ""}`} onClick={() => toggleInterest(opt.id)} style={formData.interests.includes(opt.id) ? { borderColor: opt.color, color: opt.color, background: `${opt.color}12` } : {}}>
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "planner" ? (
                <button type="submit" className="tp-generate-btn" disabled={loading || !formData.destination}>
                  {loading ? (<><FaSpinner className="spin" /> Generating...</>) : (<><FaMagic /> Generate Itinerary</>)}
                </button>
              ) : (
                <button type="button" className="tp-generate-btn recommend" disabled={loadingRecs} onClick={handleGetRecommendations}>
                  {loadingRecs ? (<><FaSpinner className="spin" /> Finding...</>) : (<><FaLightbulb /> Get AI Recommendations</>)}
                </button>
              )}
            </Paper>
          </motion.div>

          {/* ── Results Panel ── */}
          <div className="tp-results-section">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="tp-error">
                  <p>{error}</p>
                  <button onClick={() => setError(null)}>Dismiss</button>
                </motion.div>
              )}

              {/* Loading */}
              {(loading || loadingRecs) && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tp-loading">
                  <div className="tp-loading-orb">
                    <FaMagic className="spin" />
                  </div>
                  <h3>{loading ? "Crafting your perfect itinerary..." : "Finding the best destinations..."}</h3>
                  <p>Our AI is analyzing thousands of options</p>
                  <div className="tp-loading-bar"><div className="tp-loading-progress" /></div>
                </motion.div>
              )}

              {/* Itinerary Results */}
              {itinerary && activeTab === "planner" && !loading && (
                <motion.div key="itinerary" variants={containerVariants} initial="hidden" animate="visible" className="tp-itinerary">
                  <motion.div variants={itemVariants} className="tp-itinerary-header">
                    <Chip icon={<FaStar />} label="AI Generated" size="small" sx={{ mb: 1, bgcolor: "rgba(102,126,234,0.1)", color: "#667eea", fontWeight: 600, "& .MuiChip-icon": { color: "#667eea" } }} />
                    <h2>{itinerary.title || `Trip to ${formData.destination}`}</h2>
                    {itinerary.summary && <p>{itinerary.summary}</p>}
                    <button className="tp-redo-btn" onClick={handleGenerate}><FaRedo /> Regenerate</button>
                  </motion.div>

                  {itinerary.estimatedBudget && (
                    <motion.div variants={itemVariants} className="tp-budget-summary">
                      <h3><FaMoneyBillWave /> Estimated Budget</h3>
                      <div className="budget-grid">
                        {Object.entries(itinerary.estimatedBudget).map(([key, val]) => (
                          <div key={key} className="budget-item">
                            <span className="budget-label">{key}</span>
                            <span className="budget-value">{val}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {itinerary.days && itinerary.days.map((day, dayIdx) => (
                    <motion.div key={dayIdx} variants={itemVariants} className={`tp-day-card ${expandedDay === dayIdx ? "expanded" : ""}`}>
                      <button className="tp-day-header" onClick={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)}>
                        <div className="day-title">
                          <span className="day-number">Day {dayIdx + 1}</span>
                          <span className="day-theme">{day.theme || day.title || ""}</span>
                        </div>
                        <span className="day-chevron">{expandedDay === dayIdx ? <FaChevronUp /> : <FaChevronDown />}</span>
                      </button>
                      <AnimatePresence>
                        {expandedDay === dayIdx && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
                            <div className="tp-day-content">
                              {day.activities && day.activities.map((activity, actIdx) => (
                                <div key={actIdx} className="tp-activity">
                                  <div className="activity-timeline">
                                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                                    {actIdx < day.activities.length - 1 && <div className="timeline-line" />}
                                  </div>
                                  <div className="activity-content">
                                    <div className="activity-time"><FaClock /> {activity.time || "Flexible"}</div>
                                    <h4>{activity.name || activity.title}</h4>
                                    <p>{activity.description}</p>
                                    {activity.cost && <span className="activity-cost"><FaMoneyBillWave /> {activity.cost}</span>}
                                    {activity.tip && <div className="activity-tip"><FaLightbulb /> {activity.tip}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {itinerary.tips && itinerary.tips.length > 0 && (
                    <motion.div variants={itemVariants} className="tp-tips">
                      <h3><FaLightbulb /> Pro Tips</h3>
                      <ul>{itinerary.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Recommendations */}
              {recommendations && activeTab === "recommendations" && !loadingRecs && (
                <motion.div key="recs" variants={containerVariants} initial="hidden" animate="visible" className="tp-recommendations">
                  <motion.div variants={itemVariants}>
                    <h2><FaStar /> AI-Recommended Destinations</h2>
                  </motion.div>
                  <div className="rec-grid">
                    {(Array.isArray(recommendations) ? recommendations : []).map((rec, i) => (
                      <motion.div key={i} variants={itemVariants} className="rec-card">
                        <div className="rec-rank">#{i + 1}</div>
                        <h3>{rec.destination || rec.name}</h3>
                        <p className="rec-description">{rec.description || rec.reason}</p>
                        {rec.bestTime && <div className="rec-meta"><FaCalendarAlt /> Best time: {rec.bestTime}</div>}
                        {rec.estimatedCost && <div className="rec-meta"><FaMoneyBillWave /> ~{rec.estimatedCost}</div>}
                        {rec.highlights && (
                          <div className="rec-highlights">
                            {(Array.isArray(rec.highlights) ? rec.highlights : []).map((h, j) => <span key={j} className="rec-tag">{h}</span>)}
                          </div>
                        )}
                        <button className="rec-plan-btn" onClick={() => { handleChange("destination", rec.destination || rec.name); setActiveTab("planner"); }}>
                          <FaMagic /> Plan This Trip
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {!loading && !loadingRecs && !itinerary && !recommendations && !error && (
                <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="tp-empty">
                  <div className="tp-empty-visual">
                    <div className="tp-empty-globe"><FaGlobeAmericas /></div>
                    <div className="tp-empty-pin"><FaMapMarkerAlt /></div>
                  </div>
                  <h3>Your AI-Generated Trip Awaits</h3>
                  <p>Fill in your travel preferences and let our AI create a personalized itinerary just for you.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Box>
      </Container>
    </Box>
  );
};

export default TripPlanner;
