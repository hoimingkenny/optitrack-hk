CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stock_symbol" text NOT NULL,
	"direction" text NOT NULL,
	"strike_price" numeric NOT NULL,
	"expiry_date" date NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_option_per_user" UNIQUE("user_id","stock_symbol","direction","strike_price","expiry_date")
);

CREATE INDEX "idx_options_user_id" ON "options" ("user_id");
CREATE INDEX "idx_options_status" ON "options" ("status");
CREATE INDEX "idx_options_expiry" ON "options" ("expiry_date");

CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"trade_type" text NOT NULL,
	"trade_date" timestamp with time zone DEFAULT now() NOT NULL,
	"contracts" integer NOT NULL,
	"premium" numeric NOT NULL,
	"fee" numeric DEFAULT '0' NOT NULL,
	"stock_price" numeric NOT NULL,
	"hsi" numeric NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "idx_trades_option_id" ON "trades" ("option_id");
CREATE INDEX "idx_trades_user_id" ON "trades" ("user_id");
CREATE INDEX "idx_trades_trade_date" ON "trades" ("trade_date");
CREATE INDEX "idx_trades_trade_type" ON "trades" ("trade_type");

ALTER TABLE "trades" ADD CONSTRAINT "trades_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;