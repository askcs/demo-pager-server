demo-pager-server
=================

Demo TPL Pager gateway

Communicates via the (new) Ask REST API @ http://demo.standby.ask-cs.com/ with back-end domain agent 'standby-fair'

Add mapping for PagerId -> User/Password in the server.js file and add a sense account in lib/clienthandler.js

Note: For escalation this gateway will still use the 'old' back-end.
