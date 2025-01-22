const { RateLimiterMemory } = require('rate-limiter-flexible');
const { v4: uuid } = require('uuid');
const URL = require('../models/url_model');
const Analytics = require('../models/analytics_model');
const ipinfo = require('ipinfo');
const moment = require("moment");

// Rate Limiter Configuration
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 3600,
});

// Utility function to generate a random alias
const generateShortAlias = () => {
  return uuid().slice(0, 8);
};

// 2. Create Short URL API:
exports.create_short_url = async (req, res, next) => {
  const { longUrl, customAlias, topic } = req.body;
  const userId = req.user ? req.user._id : "678bb72b6078beac13ec4f8e"

  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9.-]+)\.[a-zA-Z]{2,6}(\/[^\s]*)?$/;
  if (!longUrl || !urlPattern.test(longUrl)) {
    return res.status(400).json({ message: 'Invalid URL format' });
  }

  const userIp = req.ip;

  try {

    await rateLimiter.consume(userIp);

    const alias = customAlias || generateShortAlias();
    const existingAlias = await URL.findOne({ shortUrl: alias });

    if (existingAlias) {
      return res.status(400).json({ message: 'Alias already in use' });
    }

    // Store the mapping in the database
    const shortUrl = `http://short.ly/${alias}`;
    const newUrl = new URL({
      longUrl,
      shortUrl: alias,
      customAlias: customAlias || null,
      userId,
      topic: topic || 'general',
    });

    await newUrl.save();

    res.status(201).json({
      shortUrl,
      createdAt: newUrl.createdAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(429).json({ message: 'Rate limit exceeded' });
    }
  }
};

// 3. Redirect Short URL API
exports.redirect_short_url = async (req, res, next) => {
  try {
    const alias = req.params.alias;

    const url = await URL.findOne({ shortUrl: alias });

    if (!url) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    url.clicks += 1;

    await url.save();

    const rawIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const ip = rawIp === "::1" || rawIp === "127.0.0.1" ? "8.8.8.8" : rawIp;
    const userAgent = req.get("User-Agent");

    ipinfo(ip, async (err, response) => {
      if (err) {
        console.error("Error fetching geolocation:", err);
      } else {
        const { city, region, country } = response;

        const analytics = new Analytics({
          urlId: url._id,
          userAgent,
          ip,
          geolocation: { city, region, country }
        });

        await analytics.save();
        console.log("Analytics logged:", analytics);
      }
    });

    console.log("Redirecting to URL:", url.longUrl);

    if (!url.longUrl.startsWith('http://') && !url.longUrl.startsWith('https://')) {
      url.longUrl = 'http://' + url.longUrl;
    }
    res.redirect(url.longUrl);

  } catch (error) {
    console.error("Error handling redirect:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 4.  Get URL Analytics API
exports.get_url_analytics = async (req, res) => {
  try {
    const alias = req.params.alias;

    const url = await URL.findOne({ shortUrl: alias });

    if (!url) {
      return res.status(404).json({ message: "Short URL not found" });
    }


    const aliasAnalytics = await Analytics.find({ urlId: url._id });

    if (aliasAnalytics.length === 0) {
      return res.status(404).json({ message: "No analytics data found for this alias" });
    }

    const totalClicks = aliasAnalytics.length;
    const uniqueIps = new Set(aliasAnalytics.map(entry => entry.ip));
    const uniqueUsers = uniqueIps.size;

    const clicksByDate = [];
    const last7Days = moment().subtract(7, 'days').startOf('day'); // Get the last 7 days

    for (let i = 0; i < 7; i++) {
      const date = moment(last7Days).add(i, 'days').format('YYYY-MM-DD');
      const dailyClicks = aliasAnalytics.filter(entry => moment(entry.createdAt).format('YYYY-MM-DD') === date).length;
      clicksByDate.push({ date, clickCount: dailyClicks });
    }


    const osType = [];
    const osData = aliasAnalytics.reduce((acc, entry) => {
      const osName = entry.userAgent.split(' ')[0];
      const ip = entry.ip;
      if (!acc[osName]) acc[osName] = { uniqueClicks: 0, uniqueUsers: new Set() };
      acc[osName].uniqueClicks++;
      acc[osName].uniqueUsers.add(ip);
      return acc;
    }, {});

    for (const os in osData) {
      osType.push({
        osName: os,
        uniqueClicks: osData[os].uniqueClicks,
        uniqueUsers: osData[os].uniqueUsers.size,
      });
    }

    const deviceType = [];
    const deviceData = aliasAnalytics.reduce((acc, entry) => {
      const deviceName = entry.userAgent.includes("Mobile") ? "mobile" : "desktop";
      const ip = entry.ip;
      if (!acc[deviceName]) acc[deviceName] = { uniqueClicks: 0, uniqueUsers: new Set() };
      acc[deviceName].uniqueClicks++;
      acc[deviceName].uniqueUsers.add(ip);
      return acc;
    }, {});

    for (const device in deviceData) {
      deviceType.push({
        deviceName: device,
        uniqueClicks: deviceData[device].uniqueClicks,
        uniqueUsers: deviceData[device].uniqueUsers.size,
      });
    }

    const analyticsSummary = {
      totalClicks,
      uniqueUsers,
      clicksByDate,
      osType,
      deviceType,
    };

    res.status(200).json(analyticsSummary);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// 5. Get Topic-Based Analytics API
exports.get_topic_based_analytics = async (req, res) => {
  try {
    const topic = req.params.topic;

    // Find all URLs in the database that belong to the specified topic
    const urls = await URL.find({ topic });

    if (urls.length === 0) {
      return res.status(404).json({ message: "No URLs found for this topic" });
    }

    let totalClicks = 0;
    let uniqueIps = new Set();
    let clicksByDate = [];
    let osType = [];
    let deviceType = [];

    const urlAnalytics = [];
    for (let url of urls) {
      const analytics = await Analytics.find({ urlId: url._id });

      totalClicks += analytics.length;
      analytics.forEach(entry => {
        uniqueIps.add(entry.ip);

        // Collect data for clicks by date
        const date = entry.createdAt.toISOString().split('T')[0]; // Get the date part (YYYY-MM-DD)
        const existingDate = clicksByDate.find(item => item.date === date);
        if (existingDate) {
          existingDate.clicks++;
        } else {
          clicksByDate.push({ date, clicks: 1 });
        }

        const osName = entry.userAgent.includes('Windows') ? 'Windows' :
          entry.userAgent.includes('Macintosh') ? 'macOS' :
            entry.userAgent.includes('Linux') ? 'Linux' :
              entry.userAgent.includes('iPhone') || entry.userAgent.includes('iPad') ? 'iOS' :
                entry.userAgent.includes('Android') ? 'Android' : 'Other';

        const os = osType.find(item => item.osName === osName);
        if (os) {
          os.uniqueClicks++;
          os.uniqueUsers.add(entry.ip);
        } else {
          osType.push({
            osName,
            uniqueClicks: 1,
            uniqueUsers: new Set([entry.ip])
          });
        }

        // Collect data for device types
        const deviceTypeName = entry.userAgent.includes('Mobi') ? 'Mobile' : 'Desktop';
        const device = deviceType.find(item => item.deviceName === deviceTypeName);
        if (device) {
          device.uniqueClicks++;
          device.uniqueUsers.add(entry.ip);
        } else {
          deviceType.push({
            deviceName: deviceTypeName,
            uniqueClicks: 1,
            uniqueUsers: new Set([entry.ip])
          });
        }
      });

      const totalClicksForUrl = analytics.length;
      const uniqueUsersForUrl = new Set(analytics.map(entry => entry.ip)).size;

      urlAnalytics.push({
        shortUrl: `http://short.ly/${url.shortUrl}`,
        totalClicks: totalClicksForUrl,
        uniqueUsers: uniqueUsersForUrl,
      });
    }

    const response = {
      totalClicks,
      uniqueUsers: uniqueIps.size,
      clicksByDate,
      osType: osType.map(item => ({
        osName: item.osName,
        uniqueClicks: item.uniqueClicks,
        uniqueUsers: item.uniqueUsers.size
      })),
      deviceType: deviceType.map(item => ({
        deviceName: item.deviceName,
        uniqueClicks: item.uniqueClicks,
        uniqueUsers: item.uniqueUsers.size
      })),
      urls: urlAnalytics,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching topic-based analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 6. Get Overall Analytics API:
exports.get_overall_analytics = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.params.userId;

    // Fetch all URLs created by the user
    const userUrls = await URL.find({ userId });

    if (userUrls.length === 0) {
      return res.status(404).json({ message: "No URLs found for this user" });
    }

    let totalClicks = 0;
    let uniqueIps = new Set();
    let clicksByDate = [];
    let osType = [];
    let deviceType = [];

    // Loop through each URL and gather analytics
    const urlAnalytics = [];
    for (let url of userUrls) {

      const analytics = await Analytics.find({ urlId: url._id });

      // Calculate total clicks and unique users
      totalClicks += analytics.length;
      analytics.forEach(entry => {
        uniqueIps.add(entry.ip);

        // Collect data for clicks by date
        const date = entry.createdAt.toISOString().split('T')[0]; // Get the date part (YYYY-MM-DD)
        const existingDate = clicksByDate.find(item => item.date === date);
        if (existingDate) {
          existingDate.clicks++;
        } else {
          clicksByDate.push({ date, clicks: 1 });
        }

        const osName = entry.userAgent.includes('Windows') ? 'Windows' :
          entry.userAgent.includes('Macintosh') ? 'macOS' :
            entry.userAgent.includes('Linux') ? 'Linux' :
              entry.userAgent.includes('iPhone') || entry.userAgent.includes('iPad') ? 'iOS' :
                entry.userAgent.includes('Android') ? 'Android' : 'Other';

        const os = osType.find(item => item.osName === osName);
        if (os) {
          os.uniqueClicks++;
          os.uniqueUsers.add(entry.ip);
        } else {
          osType.push({
            osName,
            uniqueClicks: 1,
            uniqueUsers: new Set([entry.ip])
          });
        }

        // Collect data for device types
        const deviceTypeName = entry.userAgent.includes('Mobi') ? 'Mobile' : 'Desktop';
        const device = deviceType.find(item => item.deviceName === deviceTypeName);
        if (device) {
          device.uniqueClicks++;
          device.uniqueUsers.add(entry.ip);
        } else {
          deviceType.push({
            deviceName: deviceTypeName,
            uniqueClicks: 1,
            uniqueUsers: new Set([entry.ip])
          });
        }
      });

      const totalClicksForUrl = analytics.length;
      const uniqueUsersForUrl = new Set(analytics.map(entry => entry.ip)).size;

      urlAnalytics.push({
        shortUrl: `http://short.ly/${url.shortUrl}`,
        totalClicks: totalClicksForUrl,
        uniqueUsers: uniqueUsersForUrl,
      });
    }

    const response = {
      totalUrls: userUrls.length,
      totalClicks,
      uniqueUsers: uniqueIps.size,
      clicksByDate,
      osType: osType.map(item => ({
        osName: item.osName,
        uniqueClicks: item.uniqueClicks,
        uniqueUsers: item.uniqueUsers.size
      })),
      deviceType: deviceType.map(item => ({
        deviceName: item.deviceName,
        uniqueClicks: item.uniqueClicks,
        uniqueUsers: item.uniqueUsers.size
      })),
      urls: urlAnalytics,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching overall analytics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




