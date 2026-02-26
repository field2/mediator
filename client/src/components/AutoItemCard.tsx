import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import StarRating from './StarRating';
import { MediaItem } from '../types';

interface AutoItemCardProps {
	item: MediaItem;
	isAuthenticated: boolean;
	onRate: (mediaId: number, rating: number) => void;
	onRemove: (mediaId: number) => void;
}

const AutoItemCard: React.FC<AutoItemCardProps> = ({ item, isAuthenticated, onRate, onRemove }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [isPrep, setIsPrep] = useState(false);
	const slotRef = useRef<HTMLDivElement>(null);
	const overlayVarsRef = useRef({ offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 });

	const measureAndSetVars = () => {
		if (!slotRef.current) return;
		const gridRect = slotRef.current.getBoundingClientRect();
		const finalWidth = Math.min(window.innerWidth * 0.9, 400);
		const finalHeight = finalWidth * 1.5; // aspect-ratio 2/3
		const finalX = window.innerWidth / 2;
		const finalY = window.innerHeight / 2;
		const offsetX = gridRect.left + gridRect.width / 2 - finalX;
		const offsetY = gridRect.top + gridRect.height / 2 - finalY;
		const scaleX = gridRect.width / finalWidth;
		const scaleY = gridRect.height / finalHeight;

		overlayVarsRef.current = { offsetX, offsetY, scaleX, scaleY };
	};

	const handleOpen = () => {
		if (isExpanded || isClosing) return;
		measureAndSetVars();
		setIsClosing(false);
		setIsPrep(true);
		setIsExpanded(true);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => setIsPrep(false));
		});
	};

	const handleClose = () => {
		if (!isExpanded || isClosing) return;
		measureAndSetVars();
		setIsClosing(true);
		setTimeout(() => {
			setIsClosing(false);
			setIsExpanded(false);
		}, 600);
	};

	const handleMenuClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		handleOpen();
	};

	const handleRemove = () => {
		if (window.confirm('Are you sure you want to delete this item?')) {
			onRemove(item.id);
		}
	};

	const overlayVars = overlayVarsRef.current;
	const overlayStyle = {
		'--offset-x': `${overlayVars.offsetX}px`,
		'--offset-y': `${overlayVars.offsetY}px`,
		'--scale-x': `${overlayVars.scaleX}`,
		'--scale-y': `${overlayVars.scaleY}`,
	} as React.CSSProperties;

	return (
		<>
			<div ref={slotRef} className={`auto-item-slot ${isExpanded ? 'is-ghost' : ''}`}>
				<div className="auto-item-wrapper" onClick={handleOpen}>
					<div className="auto-item-card-flip">
						{/* Front */}
						<div className="auto-item-front">
							<button
								className="auto-item-card-menu"
								onClick={handleMenuClick}
								aria-label="Card menu"
							>
								⋮
							</button>
							<img
								src={item.poster_url || '/placeholder.png'}
								alt={item.title}
								className="auto-item-img"
							/>
							<div className="auto-item-title">{item.title}</div>
							{item.year && <div className="auto-item-year">{item.year}</div>}
						</div>

						{/* Back */}
						<div className="auto-item-back">
							<div className="auto-item-back-content">
								<h3>Rate</h3>
								<div className="auto-item-back-rating">
									<StarRating
										rating={item.userRating || 0}
										onRate={(r) => {
											onRate(item.id, r);
										}}
										readonly={!isAuthenticated}
									/>
								</div>
								{isAuthenticated && (
									<button
										className="auto-item-back-remove"
										onClick={(e) => {
											e.stopPropagation();
											handleRemove();
										}}
									>
										Remove
									</button>
								)}
								<p className="auto-item-back-hint">Tap to flip back</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			{isExpanded &&
				createPortal(
					<div className="auto-item-overlay-layer" onClick={handleClose}>
						<div
							className={`auto-item-card-flip auto-item-overlay flipped ${isPrep ? 'prep' : ''} ${
								isClosing ? 'closing' : ''
							}`}
							style={overlayStyle}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Front */}
							<div className="auto-item-front">
								<button
									className="auto-item-card-menu"
									onClick={handleClose}
									aria-label="Close card"
								>
									×
								</button>
								<img
									src={item.poster_url || '/placeholder.png'}
									alt={item.title}
									className="auto-item-img"
								/>
								<div className="auto-item-title">{item.title}</div>
								{item.year && <div className="auto-item-year">{item.year}</div>}
							</div>

							{/* Back */}
							<div className="auto-item-back">
								<div className="auto-item-back-content">
									<h3>Rate</h3>
									<div className="auto-item-back-rating">
										<StarRating
											rating={item.userRating || 0}
											onRate={(r) => {
												onRate(item.id, r);
												handleClose();
											}}
											readonly={!isAuthenticated}
										/>
									</div>
									{isAuthenticated && (
										<button
											className="auto-item-back-remove"
											onClick={(e) => {
												e.stopPropagation();
												handleRemove();
												handleClose();
											}}
										>
											Remove
										</button>
									)}
									<p className="auto-item-back-hint">Tap to close</p>
								</div>
							</div>
						</div>
					</div>,
					document.body
				)}
		</>
	);
};

export default AutoItemCard;
