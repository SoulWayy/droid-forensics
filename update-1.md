## Update 15:22 - LLM Quota Loop en TUI Block

Uit de lokale log files (`~/.factory/logs/droid-log-single.log`) hebben we zojuist een gigantische ontdekking gedaan met betrekking tot de "token-gebruik" en instabiliteits-klachten:

### 1. Harde Rate Limit (429) Error Loop
De Droid worker processen (aangestuurd via JSON-RPC) proberen continu de LLM API (model `custom:GLM-5.2-0`) te bereiken, maar worden afgeschoten door een harde API rate limit:
`429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10`.

Omdat de CLI Droid (waarschijnlijk de `useLLMStreaming` React hook in de UI) geen elegante afhandeling lijkt te hebben voor een terminale 'Rate Limit' fout, blijft de retry-mechanica in een oneindige lus hangen. Hij blijft het proberen en gooit elke seconde de error opnieuw.

### 2. JSON-RPC Notification Spam
Dit veroorzaakt een overbelasting op de Inter-Process Communication (IPC). Het logbestand stroomt vol met `factory_app_jsonrpc_notification_count` heartbeats, veroorzaakt door het worker proces dat zijn fouten terug push't naar de hoofd-TUI.

### 3. De TUI Crashes
We vermoeden nu sterk dat de TUI rendering fouten (zoals de `duplicate key` errors en de oneindige re-render cyclus) direct getriggerd worden door de constante stroom van foutafhandelings-statussen die de UI proberen te tekenen, maar dit niet sneller kunnen doen dan ze binnenkomen (vandaar de massale CPU en RAM pieken, en de Garbage Collection activiteit).

### Conclusie:
Het is niet zozeer dat Droid 'te veel' tokens gebruikt momenteel, maar het heeft de API quota maximaal uitgeput (waarschijnlijk via eerdere autoresearch runs) en de fallback-logica ontbreekt of triggert een fatale TUI freeze.

### Advies:
- Het Droid proces moet volledig gekilled worden om de lokale resources te bevrijden (`kill -9 2663905`).
- We moeten het API endpoint / de key verwisselen naar een vers account of een ander lokaal model in `~/.factory/`, anders zal elke nieuwe Droid run direct weer in een fatal retry-loop belanden en de TUI doen vastlopen.
