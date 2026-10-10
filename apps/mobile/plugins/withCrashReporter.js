const { withMainApplication } = require("@expo/config-plugins");

module.exports = function withCrashReporter(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes("CRASH_REPORTER_INSTALLED")) {
      return config;
    }

    const handlerCode = `
    // CRASH_REPORTER_INSTALLED
    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
        try {
            val sw = java.io.StringWriter()
            throwable.printStackTrace(java.io.PrintWriter(sw))
            val stack = sw.toString()
            android.util.Log.e("iMessageCrash", stack)
            val httpThread = Thread {
                try {
                    val url = java.net.URL("https://imessage-fwxv.onrender.com/api/debug/crash")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true
                    conn.connectTimeout = 4000
                    conn.readTimeout = 4000
                    val json = org.json.JSONObject()
                    json.put("type", "NATIVE_KOTLIN_FATAL")
                    json.put("message", throwable.message ?: "Unknown crash")
                    json.put("stack", stack)
                    val os = conn.outputStream
                    os.write(json.toString().toByteArray())
                    os.flush()
                    os.close()
                    conn.responseCode
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            httpThread.start()
            httpThread.join(3500)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        defaultHandler?.uncaughtException(thread, throwable)
    }
`;

    if (contents.includes("super.onCreate()")) {
      contents = contents.replace("super.onCreate()", `super.onCreate()\n${handlerCode}`);
    }

    config.modResults.contents = contents;
    return config;
  });
};
