CREATE TABLE "garment_images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" text NOT NULL,
	"display_key" text,
	"thumbnail_key" text,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fit_note" text,
	"status" text NOT NULL,
	"image_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garments_image_id_unique" UNIQUE("image_id"),
	CONSTRAINT "garments_category_check" CHECK (category in ('top', 'bottom', 'ethnic', 'dress', 'layer'))
);
--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_image_id_garment_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."garment_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "garment_images_owner_idx" ON "garment_images" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "garments_owner_created_idx" ON "garments" USING btree ("owner_id","created_at");