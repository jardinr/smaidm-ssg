CREATE TABLE `audit_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(2048) NOT NULL,
	`businessName` varchar(255),
	`email` varchar(320),
	`overallScore` int,
	`seoScore` int,
	`sgoScore` int,
	`geoScore` int,
	`tier` varchar(64),
	`isDemoMode` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_leads_id` PRIMARY KEY(`id`)
);
