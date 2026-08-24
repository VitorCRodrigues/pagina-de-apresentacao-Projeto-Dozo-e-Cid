(function () {
  var isPT = (document.documentElement.lang || "").toLowerCase().indexOf("pt") === 0;

  var faqsPT = [
    {
      q: "Meu dinheiro está seguro?",
      a: "Sua conta de investimento é aberta no seu próprio nome nos Estados Unidos, e a OpenDollars nunca junta o dinheiro de clientes em um fundo comum. Nós estruturamos e assessoramos; os ativos ficam com você, em um custodiante regulado, o tempo todo."
    },
    {
      q: "Isso é legal no meu país?",
      a: "Sim. Cada operação em moeda local passa por um parceiro licenciado para realizá-la no seu país, e sua conta gera os informes que a sua autoridade fiscal espera. Nada no fluxo é informal ou fora dos registros."
    },
    {
      q: "Por que investir em dólares em vez do mercado local?",
      a: "Desde 2008, os mercados da região perderam de 50% a 70% do seu valor medido em dólares, enquanto o mercado americano cresceu cerca de quatro vezes. Ao longo de uma vida de trabalho, a moeda em que suas economias rendem importa mais do que o momento de qualquer investimento isolado."
    },
    {
      q: "Quais países vocês atendem hoje?",
      a: "Estamos abrindo primeiro no Brasil e na Argentina. A estrutura foi construída para se estender pela América Latina mercado a mercado, e a lista de espera nos mostra onde a demanda é maior."
    },
    {
      q: "Qual a diferença de usar uma corretora americana direto?",
      a: "Uma conta direta em corretora deixa você pessoalmente exposto ao imposto sobre herança nos EUA acima da isenção de US$ 60 mil, não ajuda com a declaração no seu país e não oferece orientação sobre como a posição deve ser mantida. A OpenDollars resolve a estrutura antes do primeiro dólar investido."
    }
  ];

  var faqsEN = [
    {
      q: "Is my money safe?",
      a: "Your investment account is opened in your own name in the United States, and OpenDollars never pools client funds. We arrange and advise; the assets are held by you, at a regulated custodian, at all times."
    },
    {
      q: "Is this legal where I live?",
      a: "Yes. Every local-currency transaction runs through a partner licensed to handle it in your country, and your account produces the reporting your tax authority expects. Nothing about the flow is informal or off-book."
    },
    {
      q: "Why should I invest in dollars instead of my local market?",
      a: "Since 2008, regional markets have lost 50 to 70 percent of their value measured in dollars while the US market grew roughly fourfold. Over a working lifetime, the currency your savings compound in matters more than the timing of any single investment."
    },
    {
      q: "Which countries do you support today?",
      a: "We are opening in Brazil and Argentina first. The structure is built to extend across Latin America market by market, and the waitlist tells us where demand is strongest."
    },
    {
      q: "How is this different from just using a US brokerage directly?",
      a: "A direct brokerage account leaves you personally exposed to US estate tax above a $60,000 exemption, gives you no help with home-country reporting, and offers no advice on how the position should be held. OpenDollars solves the structure before the first dollar is invested."
    }
  ];

  var faqs = isPT ? faqsPT : faqsEN;
  var openIndex = 0;
  var root = document.getElementById("faq");

  function renderFaq() {
    if (!root) return;
    root.innerHTML = "";
    faqs.forEach(function (item, i) {
      var wrap = document.createElement("div");
      wrap.className = "faq__item";

      var btn = document.createElement("button");
      btn.className = "faq__q";
      btn.type = "button";
      btn.setAttribute("aria-expanded", String(openIndex === i));
      btn.innerHTML = "<span>" + item.q + "</span><span class='faq__sign'>" + (openIndex === i ? "\u2212" : "+") + "</span>";
      btn.addEventListener("click", function () {
        openIndex = openIndex === i ? -1 : i;
        renderFaq();
      });

      var panel = document.createElement("div");
      panel.className = "faq__panel" + (openIndex === i ? " is-open" : "");

      var answer = document.createElement("div");
      answer.className = "faq__a";
      var inner = document.createElement("p");
      inner.className = "faq__inner";
      inner.textContent = item.a;
      answer.appendChild(inner);
      panel.appendChild(answer);

      wrap.appendChild(btn);
      wrap.appendChild(panel);
      root.appendChild(wrap);
    });
  }

  renderFaq();

  var form = document.getElementById("waitlist-form");
  var email = document.getElementById("waitlist-email");
  var success = document.getElementById("waitlist-success");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
      if (!valid) {
        email.classList.add("is-invalid");
        email.focus();
        return;
      }
      email.classList.remove("is-invalid");
      // TODO: send email.value to your backend / CRM here.
      form.hidden = true;
      success.hidden = false;
    });
    email.addEventListener("input", function () {
      email.classList.remove("is-invalid");
    });
  }

  // reveal ao rolar
  var revealTargets = [];
  document.querySelectorAll("section").forEach(function (section) {
    var groups = section.querySelectorAll(
      ".section__head, .estate__head, .hero__stats, .stat, .card, .chart, .steps__item, .estate__figures > div, .estate__close > *, .checklist, .note, .markets, .waitlist, .faq, .grid-2 > div:not(.markets)"
    );
    var list = groups.length ? groups : [section];
    list.forEach(function (el, i) {
      el.classList.add("reveal");
      if (i % 4) el.setAttribute("data-delay", String(i % 4));
      revealTargets.push(el);
    });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });

    // varredura de segurança: nada acima da viewport fica invisível
    var sweep = function () {
      revealTargets.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) {
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    };
    window.addEventListener("load", sweep);
    setTimeout(sweep, 400);
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: "smooth" });
    });
  });
})();
