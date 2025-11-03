class DataCache {
  constructor() {
    this.cache = {
      tabla: { data: null, timestamp: null },
      noticias: { data: null, timestamp: null },
      goleadores: { data: null, timestamp: null },
      equipos: { data: null, timestamp: null }
    };
    this.CACHE_DURATION = 30 * 60 * 1000;
  }

  set(key, data) {
    this.cache[key] = {
      data: data,
      timestamp: Date.now()
    };
  }

  get(key) {
    const cached = this.cache[key];
    if (!cached || !cached.data || !cached.timestamp) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      return null;
    }

    return cached.data;
  }

  isExpired(key) {
    const cached = this.cache[key];
    if (!cached || !cached.timestamp) return true;
    
    const now = Date.now();
    return (now - cached.timestamp) > this.CACHE_DURATION;
  }

  getStale(key) {
    const cached = this.cache[key];
    if (!cached || !cached.data) {
      return null;
    }
    return cached.data;
  }

  clear(key) {
    if (key) {
      this.cache[key] = { data: null, timestamp: null };
    } else {
      this.cache = {
        tabla: { data: null, timestamp: null },
        noticias: { data: null, timestamp: null },
        goleadores: { data: null, timestamp: null },
        equipos: { data: null, timestamp: null }
      };
    }
  }
}

module.exports = new DataCache();
