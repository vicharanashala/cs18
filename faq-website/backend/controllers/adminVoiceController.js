const VoiceAnalytics = require('../models/VoiceAnalytics');
const SystemSettings = require('../models/SystemSettings');

exports.getStats = async (req, res) => {
  try {
    const totalCalls = await VoiceAnalytics.countDocuments();
    
    // Aggregate for latency and tokens
    const stats = await VoiceAnalytics.aggregate([
      {
        $group: {
          _id: null,
          avgLatency: { $avg: "$latencyMs" },
          totalTokens: { $sum: "$tokensUsed" }
        }
      }
    ]);

    // Active Sessions (approximated by unique IPs in the last 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeSessionsArray = await VoiceAnalytics.distinct('ip', {
      timestamp: { $gte: fifteenMinsAgo }
    });
    const activeSessions = activeSessionsArray.length;

    const avgLatency = stats.length > 0 && stats[0].avgLatency ? Math.round(stats[0].avgLatency) : 0;
    const tokenUsage = stats.length > 0 && stats[0].totalTokens ? stats[0].totalTokens : 0;

    res.json({
      success: true,
      stats: {
        totalCalls,
        activeSessions,
        avgLatency: `${avgLatency}ms`,
        tokenUsage: tokenUsage >= 1000000 ? (tokenUsage / 1000000).toFixed(1) + 'M' : 
                    tokenUsage >= 1000 ? (tokenUsage / 1000).toFixed(1) + 'K' : 
                    tokenUsage.toString()
      }
    });
  } catch (error) {
    console.error("Error fetching voice stats:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

exports.getConfig = async (req, res) => {
  try {
    const settings = await SystemSettings.get();
    res.json({
      success: true,
      config: {
        beeEnabled: settings.beeEnabled,
        beeSystemPrompt: settings.beeSystemPrompt
      }
    });
  } catch (error) {
    console.error("Error fetching voice config:", error);
    res.status(500).json({ success: false, message: "Failed to fetch config" });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { beeEnabled, beeSystemPrompt } = req.body;
    const settings = await SystemSettings.get();
    
    if (typeof beeEnabled === 'boolean') {
      settings.beeEnabled = beeEnabled;
    }
    if (typeof beeSystemPrompt === 'string') {
      settings.beeSystemPrompt = beeSystemPrompt;
    }
    
    settings.updatedBy = req.user.id;
    await settings.save();

    res.json({ success: true, message: "Configuration saved successfully" });
  } catch (error) {
    console.error("Error updating voice config:", error);
    res.status(500).json({ success: false, message: "Failed to save config" });
  }
};
