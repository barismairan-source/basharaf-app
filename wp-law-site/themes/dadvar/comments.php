<?php
/**
 * Comments (closed by default for legal content; shown only when enabled).
 *
 * @package Dadvar
 */

defined( 'ABSPATH' ) || exit;

if ( post_password_required() ) {
	return;
}
?>
<section id="comments" class="comments">
	<?php if ( have_comments() ) : ?>
		<h2 class="comments__title">دیدگاه‌ها</h2>
		<ol class="comments__list">
			<?php
			wp_list_comments(
				array(
					'style'      => 'ol',
					'short_ping' => true,
				)
			);
			?>
		</ol>
		<?php the_comments_navigation(); ?>
	<?php endif; ?>
	<?php
	comment_form(
		array(
			'title_reply'          => 'ثبت دیدگاه',
			'label_submit'         => 'ارسال دیدگاه',
			'comment_notes_before' => '<p class="comment-notes">لطفاً از نوشتن جزئیات پروندهٔ شخصی خودداری کنید؛ برای مشاوره از فرم تماس استفاده کنید.</p>',
		)
	);
	?>
</section>
