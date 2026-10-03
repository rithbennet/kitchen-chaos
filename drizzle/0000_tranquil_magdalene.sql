CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`best` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_token_hash_unique` ON `players` (`token_hash`);--> statement-breakpoint
CREATE INDEX `players_ranking` ON `players` ("best" desc,`updated_at`,`id`);