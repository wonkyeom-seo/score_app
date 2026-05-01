let currentUser = null;
let scores = {};

function calc() {
    const perform = Number(document.getElementById("perform").value) || 0;
    const test = Number(document.getElementById("test").value) || 0;
    const ratio = Number(document.getElementById("ratio").value) || 0;

    const total = perform + (test * (ratio / 100));

    let grade = "";
    if (total >= 89.5) grade = "A";
    else if (total >= 79.5) grade = "B";
    else if (total >= 69.5) grade = "C";
    else grade = "D";

    document.getElementById("result").innerText =
        `점수: ${total.toFixed(1)} / 등급: ${grade}`;

    scores = { perform, test, ratio };
}

document.addEventListener("input", calc);

async function register() {
    await fetch("/register", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    });
}

async function login() {
    const res = await fetch("/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    });

    const data = await res.json();

    if (data.success) {
        currentUser = username.value;
        document.getElementById("auth").style.display = "none";
        document.getElementById("app").style.display = "block";

        if (data.scores) {
            document.getElementById("perform").value = data.scores.perform || 0;
            document.getElementById("test").value = data.scores.test || 0;
            document.getElementById("ratio").value = data.scores.ratio || 50;
        }

        calc();
    }
}

async function save() {
    await fetch("/save", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: currentUser,
            scores
        })
    });
}
