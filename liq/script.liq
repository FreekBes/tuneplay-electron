#!/usr/bin/liquidsoap

# Log dir
# set("log.file.path","C:\Users\Freek\Documents\html\tuneplay\electron\liq\tuneplay-mp.log")

# Live DJ stuff
set("harbor.bind_addr","0.0.0.0")
set("harbor.verbose",true)
livedj = input.harbor(
       "mount",
       port=4002,
       password="hackme"
)

# If something goes wrong, we'll play this
# no
# security = single("/home/osboxes/Documents/liquidsoap/error.mp3")

# Set Radio
radio = fallback(track_sensitive = false, [livedj])


# Stream it out
output.icecast(
        %mp3(bitrate=256),
        fallible=true,
        host = "tuneplay.net",
        port = 4003,
        password = "tpmultiplayer",
        mount = "MULTI-01",
        radio
)