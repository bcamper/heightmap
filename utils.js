// Debug log

function log (msg)
{
    if (log.debug == true && msg && window && window.console && window.console.log) {
        window.console.log(msg);
    }
}

log.debug = true;
