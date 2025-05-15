const _aa = {
    // serverboumnd
    topic: "realtime:call:00000000-0000-0000-0000-000000000000",
    event: "phx_join",
    payload: {
        config: {
            broadcast: { ack: false, self: false },
            presence: { key: "9c257791-0fa1-4348-b8cd-bd6e65dcc0f1" },
            postgres_changes: [],
            private: false,
        },
        access_token: "eyJ...",
    },
    ref: "3",
    join_ref: "3",
};

const a = {
    // serberbound
    topic: "realtime:call:00000000-0000-0000-0000-000000000000",
    event: "presence",
    payload: { type: "presence", event: "track", payload: { id: "c59218d0-c7f8-4921-a914-cca3af98800c" } },
    ref: "4",
    join_ref: "3",
};

const __AA = {
    // servervound
    messages: [
        {
            topic: "call:00000000-0000-0000-0000-000000000000",
            event: "signal",
            payload: {
                sender: "9c257791-0fa1-4348-b8cd-bd6e65dcc0f1",
                reviever: "c3b73082-7a58-4e74-87dd-777e62dbab0d",
                signal: {
                    type: "candidate",
                    candidate: {
                        candidate: "candidate:3 1 TCP 2105524479 192.168.0.220 9 typ host tcptype active",
                        sdpMLineIndex: 2,
                        sdpMid: "2",
                    },
                },
            },
            private: false,
        },
    ],
};

const b = {
    // clientbound
    ref: null,
    event: "presence_diff",
    payload: {
        joins: {
            "9c257791-0fa1-4348-b8cd-bd6e65dcc0f1": {
                metas: [{ phx_ref: "GD_FhskMcW5pb_ZO", id: "c59218d0-c7f8-4921-a914-cca3af98800c" }],
            },
        },
        leaves: {},
    },
    topic: "realtime:call:00000000-0000-0000-0000-000000000000",
};

/**
```js
async function twoUsers() {
    const users = await Promise.all([login("myusername", "securepassword"), login("Tom", "password.")]);

    console.log(users.map((x) => x.user.user_metadata.username));

    let res;
    for (const user of users) {
        const username = user.user.user_metadata.username;
        const log = (...a) => {
            process.stdout.write(username + " > ");
            console.dir(a, { depth: null });
        };

        user.socket = new MessageSocket(user.access_token);

        user.socket.on("presence-diff", (payload) => log("DIFF", payload));

        user.socket.connect();
        await new Promise((r) => user.socket.once("open", r));

        res = await user.socket.joinRoom("TEST_ROOM");
        log("JOIN ROOM RES", res);

        res = await user.socket.sendMessage(
            "realtime:room:TEST_ROOM",
            "presence",
            {
                type: "presence",
                event: "track",
                payload: { id: "payload.id in presence track" },
            },
            true
        );
        log("PRESENCE TRACK RES", res);
    }

    setTimeout(() => {
        console.log("Closing one socket...");
        users[0].socket.socket.close();
    }, 5_000);
}
```
-------------------------------------------------------------------------------
[ 'myusername', 'Tom' ]
realtime:room:TEST_ROOM {} null
myusername > [
  'JOIN ROOM RES',
  { status: 'ok', response: { postgres_changes: [] } }
]
myusername > [
  'DIFF',
  {
    joins: {
      'payload.config.presence.key in phx_join': {
        metas: [
          {
            phx_ref: 'GD_HWUj-QISP4GiP',
            id: 'payload.id in presence track'
          }
        ]
      }
    },
    leaves: {}
  }
]
myusername > [ 'PRESENCE TRACK RES', { status: 'ok', response: {} } ]
realtime:room:TEST_ROOM {} null
Tom > [
  'JOIN ROOM RES',
  { status: 'ok', response: { postgres_changes: [] } }
]
Tom > [
  'DIFF',
  {
    joins: {
      'payload.config.presence.key in phx_join': {
        metas: [
          {
            phx_ref: 'GD_HWWGDc6MxzpLC',
            id: 'payload.id in presence track'
          }
        ]
      }
    },
    leaves: {}
  }
]
Tom > [ 'PRESENCE TRACK RES', { status: 'ok', response: {} } ]
Tom > [
  'DIFF',
  {
    joins: {
      'payload.config.presence.key in phx_join': {
        metas: [
          {
            phx_ref: 'GD_HWUj-QISP4GiP',
            id: 'payload.id in presence track'
          }
        ]
      }
    },
    leaves: {}
  }
]
myusername > [
  'DIFF',
  {
    joins: {
      'payload.config.presence.key in phx_join': {
        metas: [
          {
            phx_ref: 'GD_HWWGDc6MxzpLC',
            id: 'payload.id in presence track'
          }
        ]
      }
    },
    leaves: {}
  }
]

(...5 seconds later)

Closing one socket...
Tom > [
  'DIFF',
  {
    joins: {},
    leaves: {
      'payload.config.presence.key in phx_join': {
        metas: [
          {
            phx_ref: 'GD_HWUj-QISP4GiP',
            id: 'payload.id in presence track'
          }
        ]
      }
    }
  }
]
^C
*/
